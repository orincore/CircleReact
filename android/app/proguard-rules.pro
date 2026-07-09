# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Keep readable crash reports (paired with the mapping.txt uploaded to Play Console)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# React Native bridge methods/props are invoked by exact name via JNI/reflection
-keep,allowobfuscation @interface com.facebook.react.bridge.ReactMethod
-keep,allowobfuscation @interface com.facebook.react.uimanager.annotations.ReactProp
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.uimanager.annotations.ReactProp *;
}

# react-native-webrtc (JNI native peer classes referenced by name)
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**

# lottie-react-native
-keep class com.airbnb.lottie.** { *; }

# Google Play services (Ads, Maps, Play Billing via react-native-iap) - defensive,
# most of these AARs ship their own consumer-rules.pro but keep as a safety net
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Firebase (app, messaging)
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# okhttp/okio (used transitively by RN networking + several native SDKs)
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# @generated begin expo-build-properties - expo prebuild (DO NOT MODIFY)
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
# @generated end expo-build-properties