import ExpoModulesCore
import CoreHaptics
import QuartzCore

/// Wraps `CHHapticEngine` to drive a textured, paper-like "scratch" haptic for
/// pull-to-refresh.
///
/// Instead of one smooth continuous event (which just feels like a flat buzz),
/// this loops a *granular texture* pattern: a long sequence of short, irregularly
/// spaced, randomized transients — the haptic equivalent of dragging a finger
/// across paper fibers. Finger velocity drives both the player's `playbackRate`
/// (grain density / scratch speed) and its overall intensity, so it feels like
/// real friction: faster/harder = grittier, and it goes silent the moment the
/// finger stops moving (a native decay timer fades it out when JS stops sending
/// updates, e.g. while a pulled-down finger is held still).
///
/// The engine + texture player are kept warm between gestures and pre-warmed on
/// drag begin, so the first grain never drops even after the Taptic Engine idles.
public class CircleHapticsModule: Module {
  private var engine: CHHapticEngine?
  private var texturePlayer: CHHapticAdvancedPatternPlayer?
  private let supportsHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics

  // Live control state, mutated only on `controlQueue`.
  private let controlQueue = DispatchQueue(label: "com.orincore.Circle.haptics")
  private var decayTimer: DispatchSourceTimer?
  private var targetIntensity: Float = 0
  private var currentIntensity: Float = 0
  private var currentSharpness: Float = 0
  private var lastUpdate: CFTimeInterval = 0

  // Texture pattern length (s). Long enough that the loop isn't perceptibly
  // periodic during a pull.
  private let textureDuration = 4.0
  // Smoothing/decay tuning for the control timer.
  private let timerInterval = 0.016          // ~60 Hz control updates
  private let staleThreshold = 0.045         // no JS update for this long => finger stopped
  private let attackFactor: Float = 0.6      // how fast intensity rises toward target
  private let decayFactor: Float = 0.55      // how fast it fades when stale

  public func definition() -> ModuleDefinition {
    Name("CircleHaptics")

    Function("isSupported") { () -> Bool in
      return self.supportsHaptics
    }

    Function("start") {
      self.ensureEngineStarted()
      self.ensureTexturePlayer()
      self.startControlLoop()
    }

    // intensity 0..1, sharpness -1..1 offset, speed = playback rate (grain density).
    Function("updateScratch") { (intensity: Double, sharpness: Double, speed: Double) in
      self.update(intensity: Float(intensity), sharpness: Float(sharpness), speed: Float(speed))
    }

    Function("stop") {
      self.mute()
    }

    Function("triggerSnap") { (intensity: Double, sharpness: Double) in
      self.playTransient(intensity: Float(intensity), sharpness: Float(sharpness))
    }

    OnDestroy {
      self.teardown()
    }
  }

  // MARK: - Engine lifecycle

  private func ensureEngineStarted() {
    guard supportsHaptics else { return }

    if engine == nil {
      do {
        let engine = try CHHapticEngine()
        engine.isAutoShutdownEnabled = false   // keep warm between pulls
        engine.playsHapticsOnly = true

        engine.stoppedHandler = { _ in
          self.texturePlayer = nil
        }
        engine.resetHandler = { [weak self] in
          guard let self = self else { return }
          self.texturePlayer = nil
          try? self.engine?.start()
        }
        self.engine = engine
      } catch {
        self.engine = nil
        return
      }
    }

    try? engine?.start()
  }

  private func ensureTexturePlayer() {
    guard supportsHaptics, let engine = engine else { return }

    if texturePlayer == nil {
      guard let pattern = makeTexturePattern() else { return }
      do {
        let player = try engine.makeAdvancedPlayer(with: pattern)
        player.loopEnabled = true
        self.texturePlayer = player
      } catch {
        self.texturePlayer = nil
        return
      }
    }

    // Start muted; the control loop ramps intensity from finger movement.
    sendParameters(intensity: 0, sharpness: 0)
    try? texturePlayer?.start(atTime: CHHapticTimeImmediate)
  }

  /// Builds a long loop of short, irregularly spaced, randomized transients —
  /// the granular "paper fiber" texture.
  private func makeTexturePattern() -> CHHapticPattern? {
    var events: [CHHapticEvent] = []
    var t = 0.0
    while t < textureDuration {
      let grainIntensity = Float.random(in: 0.5...1.0)
      let grainSharpness = Float.random(in: 0.7...1.0)   // crisp = gritty paper grain
      events.append(
        CHHapticEvent(
          eventType: .hapticTransient,
          parameters: [
            CHHapticEventParameter(parameterID: .hapticIntensity, value: grainIntensity),
            CHHapticEventParameter(parameterID: .hapticSharpness, value: grainSharpness),
          ],
          relativeTime: t
        )
      )
      // Irregular spacing so it never sounds like a periodic motor.
      t += Double.random(in: 0.011...0.028)   // ~36–90 grains/sec at rate 1.0
    }
    return try? CHHapticPattern(events: events, parameters: [])
  }

  // MARK: - Live control loop

  private func startControlLoop() {
    controlQueue.async {
      if self.decayTimer != nil { return }
      let timer = DispatchSource.makeTimerSource(queue: self.controlQueue)
      timer.schedule(deadline: .now(), repeating: self.timerInterval)
      timer.setEventHandler { [weak self] in self?.tick() }
      self.decayTimer = timer
      timer.resume()
    }
  }

  private func tick() {
    // If JS hasn't sent a fresh value recently the finger has stopped — fade out.
    if CACurrentMediaTime() - lastUpdate > staleThreshold {
      targetIntensity = 0
    }
    let factor = targetIntensity > currentIntensity ? attackFactor : decayFactor
    currentIntensity += (targetIntensity - currentIntensity) * factor
    if currentIntensity < 0.02 { currentIntensity = 0 }
    sendParameters(intensity: currentIntensity, sharpness: currentSharpness)
  }

  private func update(intensity: Float, sharpness: Float, speed: Float) {
    guard supportsHaptics else { return }
    controlQueue.async {
      if self.texturePlayer == nil {
        self.ensureEngineStarted()
        self.ensureTexturePlayer()
        self.startControlLoop()
      }
      self.targetIntensity = max(0, min(1, intensity))
      self.currentSharpness = max(-1, min(1, sharpness))
      self.lastUpdate = CACurrentMediaTime()
      // Scratch speed -> grain density. Clamp to Core Haptics' valid range.
      self.texturePlayer?.playbackRate = max(0.1, min(2.0, speed))
    }
  }

  private func sendParameters(intensity: Float, sharpness: Float) {
    let intensityParam = CHHapticDynamicParameter(
      parameterID: .hapticIntensityControl, value: intensity, relativeTime: 0)
    let sharpnessParam = CHHapticDynamicParameter(
      parameterID: .hapticSharpnessControl, value: sharpness, relativeTime: 0)
    try? texturePlayer?.sendParameters([intensityParam, sharpnessParam], atTime: CHHapticTimeImmediate)
  }

  private func mute() {
    guard supportsHaptics else { return }
    controlQueue.async {
      self.decayTimer?.cancel()
      self.decayTimer = nil
      self.targetIntensity = 0
      self.currentIntensity = 0
      self.sendParameters(intensity: 0, sharpness: 0)
      try? self.texturePlayer?.stop(atTime: CHHapticTimeImmediate)
      // Engine stays warm for the next pull.
    }
  }

  private func playTransient(intensity: Float, sharpness: Float) {
    guard supportsHaptics else { return }
    ensureEngineStarted()
    guard let engine = engine else { return }
    let i = CHHapticEventParameter(parameterID: .hapticIntensity, value: max(0, min(1, intensity)))
    let s = CHHapticEventParameter(parameterID: .hapticSharpness, value: max(0, min(1, sharpness)))
    let event = CHHapticEvent(eventType: .hapticTransient, parameters: [i, s], relativeTime: 0)
    do {
      let pattern = try CHHapticPattern(events: [event], parameters: [])
      let player = try engine.makePlayer(with: pattern)
      try player.start(atTime: CHHapticTimeImmediate)
    } catch {}
  }

  private func teardown() {
    controlQueue.sync {
      decayTimer?.cancel()
      decayTimer = nil
    }
    try? texturePlayer?.stop(atTime: CHHapticTimeImmediate)
    texturePlayer = nil
    engine?.stop()
    engine = nil
  }
}
