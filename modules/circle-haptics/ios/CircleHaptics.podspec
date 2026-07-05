Pod::Spec.new do |s|
  s.name           = 'CircleHaptics'
  s.version        = '1.0.0'
  s.summary        = 'Native Core Haptics continuous scratch for pull-to-refresh'
  s.description    = 'Wraps CHHapticEngine to play a continuous, intensity/sharpness-modulated scratch with no cold-start drop.'
  s.author         = 'Circle'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
