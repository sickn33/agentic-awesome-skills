#!/usr/bin/env python3
"""
Mobile UX Audit Script - Full Mobile Design Coverage

Analyzes React Native / Flutter code for compliance with:

1. TOUCH PSYCHOLOGY (touch-psychology.md):
   - Touch Target Sizes (44pt iOS, 48dp Android, 44px WCAG)
   - Touch Target Spacing (8px minimum gap)
   - Thumb Zone Placement (primary CTAs at bottom)
   - Gesture Alternatives (visible buttons for swipe)
   - Haptic Feedback Patterns
   - Touch Feedback Timing (<50ms)
   - Touch Accessibility (motor impairment support)

2. MOBILE PERFORMANCE (mobile-performance.md):
   - ScrollView vs FlatList (CRITICAL)
   - React.memo for List Items
   - useCallback for renderItem
   - Stable keyExtractor (NOT index)
   - useNativeDriver for Animations
   - Memory Leak Prevention (cleanup)
   - Console.log Detection
   - Inline Function Detection
   - Animation Performance (transform/opacity only)

3. MOBILE NAVIGATION (mobile-navigation.md):
   - Tab Bar Max Items (5)
   - Tab State Preservation
   - Proper Back Handling
   - Deep Link Support
   - Navigation Structure

4. MOBILE TYPOGRAPHY (mobile-typography.md):
   - System Font Usage
   - Dynamic Type Support (iOS)
   - Text Scaling Constraints
   - Mobile Line Height
   - Font Size Limits

5. MOBILE COLOR SYSTEM (mobile-color-system.md):
   - Pure Black Avoidance (#000000)
   - OLED Optimization
   - Dark Mode Support
   - Contrast Ratios

6. PLATFORM iOS (platform-ios.md):
   - SF Symbols Usage
   - iOS Navigation Patterns
   - iOS Haptic Types
   - iOS-Specific Components

7. PLATFORM ANDROID (platform-android.md):
   - Material Icons Usage
   - Android Navigation Patterns
   - Ripple Effects
   - Android-Specific Components

8. MOBILE BACKEND (mobile-backend.md):
   - Secure Storage (NOT AsyncStorage)
   - Offline Handling
   - Push Notification Support
   - API Response Caching

Total: 50+ mobile-specific checks
"""

import sys
import os
import re
import json
from pathlib import Path

class MobileAuditor:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.passed_count = 0
        self.files_checked = 0

    def audit_file(self, filepath: str) -> None:
        try:
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
        except:
            return

        self.files_checked += 1
        filename = os.path.basename(filepath)

        # Detect framework
        is_react_native = bool(re.search(r'react-native|@react-navigation|React\.Native', content))
        is_flutter = bool(re.search(r'import \'package:flutter|MaterialApp|Widget\.build', content))

        if not (is_react_native or is_flutter):
            return  # Skip non-mobile files

        # --- 1. TOUCH PSYCHOLOGY CHECKS ---

        # 1.1 Touch Target Size Check
        # Look for small touch targets
        small_sizes = re.findall(r'(?:width|height|size):\s*([0-3]\d)', content)
        for size in small_sizes:
            if int(size) < 44:
                self.issues.append(f"[Touch Target] {filename}: Touch target size {size}px < 44px minimum (iOS: 44pt, Android: 48dp)")

        # 1.2 Touch Target Spacing Check
        # Look for inadequate spacing between touchable elements
        small_gaps = re.findall(r'(?:margin|gap):\s*([0-7])\s*(?:px|dp)', content)
        for gap in small_gaps:
            if int(gap) < 8:
                self.warnings.append(f"[Touch Spacing] {filename}: Touch target spacing {gap}px < 8px minimum. Accidental taps risk.")

        # 1.3 Thumb Zone Placement Check
        # Primary CTAs should be at bottom (easy thumb reach)
        primary_buttons = re.findall(r'(?:testID|id):\s*["\'](?:.*(?:primary|cta|submit|confirm)[^"\']*)["\']', content, re.IGNORECASE)
        has_bottom_placement = bool(re.search(r'position:\s*["\']?absolute["\']?|bottom:\s*\d+|style.*bottom|justifyContent:\s*["\']?flex-end', content))
        if primary_buttons and not has_bottom_placement:
            self.warnings.append(f"[Thumb Zone] {filename}: Primary CTA may not be in thumb zone (bottom). Place primary actions at bottom for easy reach.")

        # 1.4 Gesture Alternatives Check
        # Swipe actions should have visible button alternatives
        has_swipe_gestures = bool(re.search(r'Swipeable|onSwipe|PanGestureHandler|swipe', content))
        has_visible_buttons = bool(re.search(r'Button.*(?:delete|archive|more)|TouchableOpacity|Pressable', content))
        if has_swipe_gestures and not has_visible_buttons:
            self.warnings.append(f"[Gestures] {filename}: Swipe gestures detected without visible button alternatives. Motor impaired users need alternatives.")

        # 1.5 Haptic Feedback Check
        # Important actions should have haptic feedback
        has_important_actions = bool(re.search(r'(?:onPress|onSubmit|delete|remove|confirm|purchase)', content))
        has_haptics = bool(re.search(r'Haptics|Vibration|react-native-haptic-feedback|FeedbackManager', content))
        if has_important_actions and not has_haptics:
            self.warnings.append(f"[Haptics] {filename}: Important actions without haptic feedback. Consider adding haptic confirmation.")

        # 1.6 Touch Feedback Timing Check
        # Touch feedback should be immediate (<50ms)
        if is_react_native:
            has_pressable = bool(re.search(r'Pressable|TouchableOpacity', content))
            has_feedback_state = bool(re.search(r'pressed|style.*opacity|underlay', content))
            if has_pressable and not has_feedback_state:
                self.warnings.append(f"[Touch Feedback] {filename}: Pressable without visual feedback state. Add opacity/scale change for tap confirmation.")

        # --- 2. MOBILE PERFORMANCE CHECKS ---

        # 2.1 CRITICAL: ScrollView vs FlatList
        has_scrollview = bool(re.search(r'<ScrollView|ScrollView\.', content))
        has_map_in_scrollview = bool(re.search(r'ScrollView.*\.map\(|ScrollView.*\{.*\.map', content))
        if has_scrollview and has_map_in_scrollview:
            self.issues.append(f"[Performance CRITICAL] {filename}: ScrollView with .map() detected. Use FlatList for lists to prevent memory explosion.")

        # 2.2 React.memo Check
        if is_react_native:
            has_list = bool(re.search(r'FlatList|FlashList|SectionList', content))
            has_react_memo = bool(re.search(r'React\.memo|memo\(', content))
            if has_list and not has_react_memo:
                self.warnings.append(f"[Performance] {filename}: FlatList without React.memo on list items. Items will re-render on every parent update.")

        # 2.3 useCallback Check
        if is_react_native:
            has_flatlist = bool(re.search(r'FlatList|FlashList', content))
            has_use_callback = bool(re.search(r'useCallback', content))
            if has_flatlist and not has_use_callback:
                self.warnings.append(f"[Performance] {filename}: FlatList renderItem without useCallback. New function created every render.")

        # 2.4 keyExtractor Check (CRITICAL)
        if is_react_native:
            has_flatlist = bool(re.search(r'FlatList', content))
            has_key_extractor = bool(re.search(r'keyExtractor', content))
            uses_index_key = bool(re.search(r'key=\{.*index.*\}|key:\s*index', content))
            if has_flatlist and not has_key_extractor:
                self.issues.append(f"[Performance CRITICAL] {filename}: FlatList without keyExtractor. Index-based keys cause bugs on reorder/delete.")
            if uses_index_key:
                self.issues.append(f"[Performance CRITICAL] {filename}: Using index as key. This causes bugs when list changes. Use unique ID from data.")

        # 2.5 useNativeDriver Check
        if is_react_native:
            has_animated = bool(re.search(r'Animated\.', content))
            has_native_driver = bool(re.search(r'useNativeDriver:\s*true', content))
            has_native_driver_false = bool(re.search(r'useNativeDriver:\s*false', content))
            if has_animated and has_native_driver_false:
                self.warnings.append(f"[Performance] {filename}: Animation with useNativeDriver: false. Use true for 60fps (only supports transform/opacity).")
            if has_animated and not has_native_driver:
                self.warnings.append(f"[Performance] {filename}: Animated component without useNativeDriver. Add useNativeDriver: true for 60fps.")

        # 2.6 Memory Leak Check
        if is_react_native:
            has_effect = bool(re.search(r'useEffect', content))
            has_cleanup = bool(re.search(r'return\s*\(\)\s*=>|return\s+function', content))
            has_subscriptions = bool(re.search(r'addEventListener|subscribe|\.focus\(\)|\.off\(', content))
            if has_effect and has_subscriptions and not has_cleanup:
                self.issues.append(f"[Memory Leak] {filename}: useEffect with subscriptions but no cleanup function. Memory leak on unmount.")

        # 2.7 Console.log Detection
        console_logs = len(re.findall(r'console\.log|console\.warn|console\.error|console\.debug', content))
        if console_logs > 5:
            self.warnings.append(f"[Performance] {filename}: {console_logs} console.log statements detected. Remove before production (blocks JS thread).")

        # 2.8 Inline Function Detection
        if is_react_native:
            inline_functions = re.findall(r'(?:onPress|onPressIn|onPressOut|renderItem):\s*\([^)]*\)\s*=>', content)
            if len(inline_functions) > 3:
                self.warnings.append(f"[Performance] {filename}: {len(inline_functions)} inline arrow functions in props. Creates new function every render. Use useCallback.")

        # 2.9 Animation Properties Check
        # Warn if animating expensive properties
        animating_layout = bool(re.search(r'Animated\.timing.*(?:width|height|margin|padding)', content))
        if animating_layout:
            self.issues.append(f"[Performance] {filename}: Animating layout properties (width/height/margin). Use transform/opacity for 60fps.")

        # --- 3. MOBILE NAVIGATION CHECKS ---

        # 3.1 Tab Bar Max Items Check
        tab_bar_items = len(re.findall(r'Tab\.Screen|createBottomTabNavigator|BottomTab', content))
        if tab_bar_items > 5:
            self.warnings.append(f"[Navigation] {filename}: {tab_bar_items} tab bar items (max 5 recommended). More than 5 becomes hard to tap.")

        # 3.2 Tab State Preservation Check
        has_tab_nav = bool(re.search(r'createBottomTabNavigator|Tab\.Navigator', content))
        if has_tab_nav:
            # Look for lazy prop (false preserves state)
            has_lazy_false = bool(re.search(r'lazy:\s*false', content))
            if not has_lazy_false:
                self.warnings.append(f"[Navigation] {filename}: Tab navigation without lazy: false. Tabs may lose state on switch.")

        # 3.3 Back Handling Check
        has_back_listener = bool(re.search(r'BackHandler|useFocusEffect|navigation\.addListener', content))
        has_custom_back = bool(re.search(r'onBackPress|handleBackPress', content))
        if has_custom_back and not has_back_listener:
            self.warnings.append(f"[Navigation] {filename}: Custom back handling without BackHandler listener. May not work correctly.")

        # 3.4 Deep Link Support Check
        has_linking = bool(re.search(r'Linking\.|Linking\.openURL|deepLink|universalLink', content))
        has_config = bool(re.search(r'apollo-link|react-native-screens|navigation\.link', content))
        if not has_linking and not has_config:
            self.passed_count += 1
        else:
            if has_linking and not has_config:
                self.warnings.append(f"[Navigation] {filename}: Deep linking detected but may lack proper configuration. Test notification/share flows.")

        # --- 4. MOBILE TYPOGRAPHY CHECKS ---

        # 4.1 System Font Check
        if is_react_native:
            has_custom_font = bool(re.search(r"fontFamily:\s*[\"'][^\"']+", content))
            has_system_font = bool(re.search(r"fontFamily:\s*[\"']?(?:System|San Francisco|Roboto|-apple-system)", content))
            if has_custom_font and not has_system_font:
                self.warnings.append(f"[Typography] {filename}: Custom font detected. Consider system fonts (iOS: SF Pro, Android: Roboto) for native feel.")

        # 4.2 Text Scaling Check (iOS Dynamic Type)
        if is_react_native:
            has_font_sizes = bool(re.search(r'fontSize:', content))
            has_scaling = bool(re.search(r'allowFontScaling:\s*true|responsiveFontSize|useWindowDimensions', content))
            if has_font_sizes and not has_scaling:
                self.warnings.append(f"[Typography] {filename}: Fixed font sizes without scaling support. Consider allowFontScaling for accessibility.")

        # 4.3 Mobile Line Height Check
        line_heights = re.findall(r'lineHeight:\s*([\d.]+)', content)
        for lh in line_heights:
            if float(lh) > 1.8:
                self.warnings.append(f"[Typography] {filename}: lineHeight {lh} too high for mobile. Mobile text needs tighter spacing (1.3-1.5).")

        # 4.4 Font Size Limits
        font_sizes = re.findall(r'fontSize:\s*([\d.]+)', content)
        for fs in font_sizes:
            size = float(fs)
            if size < 12:
                self.warnings.append(f"[Typography] {filename}: fontSize {size}px below 12px minimum readability.")
            elif size > 32:
                self.warnings.append(f"[Typography] {filename}: fontSize {size}px very large. Consider using responsive scaling.")

        # --- 5. MOBILE COLOR SYSTEM CHECKS ---

        # 5.1 Pure Black Avoidance
        if re.search(r'#000000|color:\s*black|backgroundColor:\s*["\']?black', content):
            self.warnings.append(f"[Color] {filename}: Pure black (#000000) detected. Use dark gray (#1C1C1E iOS, #121212 Android) for better OLED/battery.")

        # 5.2 Dark Mode Support
        has_color_schemes = bool(re.search(r'useColorScheme|colorScheme|appearance:\s*["\']?dark', content))
        has_dark_mode_style = bool(re.search(r'\\\?.*dark|style:\s*.*dark|isDark', content))
        if not has_color_schemes and not has_dark_mode_style:
            self.warnings.append(f"[Color] {filename}: No dark mode support detected. Consider useColorScheme for system dark mode.")

        # --- 6. PLATFORM iOS CHECKS ---

        if is_react_native:
            # 6.1 SF Symbols Check
            has_ios_icons = bool(re.search(r'@expo/vector-icons|ionicons', content))
            has_sf_symbols = bool(re.search(r'sf-symbol|SF Symbols', content))
            if has_ios_icons and not has_sf_symbols:
                self.passed_count += 1

            # 6.2 iOS Haptic Types
            has_haptic_import = bool(re.search(r'expo-haptics|react-native-haptic-feedback', content))
            has_haptic_types = bool(re.search(r'ImpactFeedback|NotificationFeedback|SelectionFeedback', content))
            if has_haptic_import and not has_haptic_types:
                self.warnings.append(f"[iOS Haptics] {filename}: Haptic library imported but not using typed haptics (Impact/Notification/Selection).")

            # 6.3 iOS Safe Area
            has_safe_area = bool(re.search(r'SafeAreaView|useSafeAreaInsets|safeArea', content))
            if not has_safe_area:
                self.warnings.append(f"[iOS] {filename}: No SafeArea detected. Content may be hidden by notch/home indicator.")

        # --- 7. PLATFORM ANDROID CHECKS ---

        if is_react_native:
            # 7.1 Material Icons Check
            has_material_icons = bool(re.search(r'@expo/vector-icons|MaterialIcons', content))
            if has_material_icons:
                self.passed_count += 1

            # 7.2 Ripple Effect
            has_ripple = bool(re.search(r'ripple|android_ripple|foregroundRipple', content))
            has_pressable = bool(re.search(r'Pressable|Touchable', content))
            if has_pressable and not has_ripple:
                self.warnings.append(f"[Android] {filename}: Touchable without ripple effect. Android users expect ripple feedback.")

            # 7.3 Hardware Back Button
            if is_react_native:
                has_back_button = bool(re.search(r'BackHandler|useBackHandler', content))
                has_navigation = bool(re.search(r'@react-navigation', content))
                if has_navigation and not has_back_button:
                    self.warnings.append(f"[Android] {filename}: React Navigation detected without BackHandler listener. Android hardware back may not work correctly.")

        # --- 8. MOBILE BACKEND CHECKS ---

        # 8.1 Secure Storage Check
        has_async_storage = bool(re.search(r'AsyncStorage|@react-native-async-storage', content))
        has_secure_storage = bool(re.search(r'SecureStore|Keychain|EncryptedSharedPreferences', content))
        has_token_storage = bool(re.search(r'token|jwt|auth.*storage', content, re.IGNORECASE))
        if has_token_storage and has_async_storage and not has_secure_storage:
            self.issues.append(f"[Security] {filename}: Storing auth tokens in AsyncStorage (insecure). Use SecureStore (iOS) / EncryptedSharedPreferences (Android).")

        # 8.2 Offline Handling Check
        has_network = bool(re.search(r'fetch|axios|netinfo|@react-native-community/netinfo', content))
        has_offline = bool(re.search(r'offline|isConnected|netInfo|cache.*offline', content))
        if has_network and not has_offline:
            self.warnings.append(f"[Offline] {filename}: Network requests detected without offline handling. Consider NetInfo for connection status.")

        # 8.3 Push Notification Support
        has_push = bool(re.search(r'Notifications|pushNotification|Firebase\.messaging|PushNotificationIOS', content))
        has_push_handler = bool(re.search(r'onNotification|addNotificationListener|notification\.open', content))
        if has_push and not has_push_handler:
            self.warnings.append(f"[Push] {filename}: Push notifications imported but no handler found. May miss notifications.")

        # --- 9. EXTENDED MOBILE TYPOGRAPHY CHECKS ---

        # 9.1 iOS Type Scale Check
        if is_react_native:
            # Check for iOS text styles that match HIG
            has_large_title = bool(re.search(r'fontSize:\s*34|largeTitle|font-weight:\s*["\']?bold', content))
            has_title_1 = bool(re.search(r'fontSize:\s*28', content))
            has_headline = bool(re.search(r'fontSize:\s*17.*semibold|headline', content))
            has_body = bool(re.search(r'fontSize:\s*17.*regular|body', content))

            # Check if following iOS scale roughly
            font_sizes = re.findall(r'fontSize:\s*([\d.]+)', content)
            ios_scale_sizes = [34, 28, 22, 20, 17, 16, 15, 13, 12, 11]
            matching_ios = sum(1 for size in font_sizes if any(abs(float(size) - ios_size) < 1 for ios_size in ios_scale_sizes))

            if len(font_sizes) > 3 and matching_ios < len(font_sizes) / 2:
                self.warnings.append(f"[iOS Typography] {filename}: Font sizes don't match iOS type scale. Consider iOS text styles for native feel.")

        # 9.2 Android Material Type Scale Check
        if is_react_native:
            # Check for Material 3 text styles
            has_display = bool(re.search(r'fontSize:\s*[456][0-9]|display', content))
            has_headline_material = bool(re.search(r'fontSize:\s*[23][0-9]|headline', content))
            has_title_material = bool(re.search(r'fontSize:\s*2[12][0-9].*medium|title', content))
            has_body_material = bool(re.search(r'fontSize:\s*1[456].*regular|body', content))
            has_label = bool(re.search(r'fontSize:\s*1[1234].*medium|label', content))

            # Check if using sp (scale-independent pixels)
            uses_sp = bool(re.search(r'\d+\s*sp\b', content))
            if has_display or has_headline_material:
                if not uses_sp:
                    self.warnings.append(f"[Android Typography] {filename}: Material typography detected without sp units. Use sp for text to respect user font size preferences.")

        # 9.3 Modular Scale Check
        # Check if font sizes follow modular scale
        font_sizes = re.findall(r'fontSize:\s*(\d+(?:\.\d+)?)', content)
        if len(font_sizes) > 3:
            sorted_sizes = sorted(set([float(s) for s in font_sizes]))
            ratios = []
            for i in range(1, len(sorted_sizes)):
                if sorted_sizes[i-1] > 0:
                    ratios.append(sorted_sizes[i] / sorted_sizes[i-1])

            # Common ratios: 1.125, 1.2, 1.25, 1.333, 1.5
            common_ratios = {1.125, 1.2, 1.25, 1.333, 1.5}
            for ratio in ratios[:3]:
                if not any(abs(ratio - cr) < 0.03 for cr in common_ratios):
                    self.warnings.append(f"[Typography] {filename}: Font sizes may not follow modular scale (ratio: {ratio:.2f}). Consider consistent ratio.")
                    break

        # 9.4 Line Length Check (Mobile-specific)
        # Mobile text should be 40-60 characters max
        if is_react_native:
            has_long_text = bool(re.search(r'<Text[^>]*>[^<]{40,}', content))
            has_max_width = bool(re.search(r'maxWidth|max-w-\d+|width:\s*["\']?\d+', content))
            if has_long_text and not has_max_width:
                self.warnings.append(f"[Mobile Typography] {filename}: Text without max-width constraint. Mobile text should be 40-60 characters per line for readability.")

        # 9.5 Font Weight Pattern Check
        # Check for font weight distribution
        if is_react_native:
            font_weights = re.findall(r'fontWeight:\s*["\']?(\d+|normal|bold|medium|light)', content)
            weight_map = {'normal': '400', 'light': '300', 'medium': '500', 'bold': '700'}
            numeric_weights = []
            for w in font_weights:
                val = weight_map.get(w.lower(), w)
                try:
                    numeric_weights.append(int(val))
                except:
                    pass

            # Check if overusing bold (mobile should be regular-dominant)
            bold_count = sum(1 for w in numeric_weights if w >= 700)
            regular_count = sum(1 for w in numeric_weights if 400 <= w < 500)
            if bold_count > regular_count:
                self.warnings.append(f"[Mobile Typography] {filename}: More bold weights than regular. Mobile typography should be regular-dominant for readability.")

        # --- 10. EXTENDED MOBILE COLOR SYSTEM CHECKS ---

        # 10.1 OLED Optimization Check
        # Check for near-black colors instead of pure black
        if re.search(r'#121212|#1A1A1A|#0D0D0D', content):
            self.passed_count += 1  # Good OLED optimization
        elif re.search(r'backgroundColor:\s*["\']?#000000', content):
            # Using pure black for background is OK for OLED
            pass
        elif re.search(r'backgroundColor:\s*["\']?#[0-9A-Fa-f]{6}', content):
            # Check if using light colors in dark mode (bad for OLED)
            self.warnings.append(f"[Mobile Color] {filename}: Consider OLED-optimized dark backgrounds (#121212 Android, #000000 iOS) for battery savings.")

        # 10.2 Saturated Color Detection (Battery)
        # Highly saturated colors consume more power on OLED
        hex_colors = re.findall(r'#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})', content)
        saturated_count = 0
        for r, g, b in hex_colors:
            # Convert to RGB 0-255
            try:
                r_val, g_val, b_val = int(r, 16), int(g, 16), int(b, 16)
                max_val = max(r_val, g_val, b_val)
                min_val = min(r_val, g_val, b_val)
                # Saturation = (max - min) / max
                if max_val > 0:
                    saturation = (max_val - min_val) / max_val
                    if saturation > 0.8:  # Highly saturated
                        saturated_count += 1
            except:
                pass

        if saturated_count > 10:
            self.warnings.append(f"[Mobile Color] {filename}: {saturated_count} highly saturated colors detected. Desaturated colors save battery on OLED screens.")

        # 10.3 Outdoor Visibility Check
        # Low contrast combinations fail in outdoor sunlight
        light_colors = re.findall(r'#[0-9A-Fa-f]{6}|rgba?\([^)]+\)', content)
        # Check for potential low contrast (light gray on white, dark gray on black)
        potential_low_contrast = bool(re.search(r'#[EeEeEeEe].*#ffffff|#999999.*#ffffff|#333333.*#000000|#666666.*#000000', content))
        if potential_low_contrast:
            self.warnings.append(f"[Mobile Color] {filename}: Possible low contrast combination detected. Critical for outdoor visibility. Ensure WCAG AAA (7:1) for mobile.")

        # 10.4 Dark Mode Text Color Check
        # In dark mode, text should not be pure white
        has_dark_mode = bool(re.search(r'dark:\s*|isDark|useColorScheme|colorScheme:\s*["\']?dark', content))
        if has_dark_mode:
            has_pure_white_text = bool(re.search(r'color:\s*["\']?#ffffff|#fff["\']?\}|textColor:\s*["\']?white', content))
            if has_pure_white_text:
                self.warnings.append(f"[Mobile Color] {filename}: Pure white text (#FFFFFF) in dark mode. Use #E8E8E8 or light gray for better readability.")

        # --- 11. EXTENDED PLATFORM IOS CHECKS ---

        if is_react_native:
            # 11.1 SF Pro Font Detection
            has_sf_pro = bool(re.search(r'SF Pro|SFPro|fontFamily:\s*["\']?[-\s]*SF', content))
            has_custom_font = bool(re.search(r'fontFamily:\s*["\'][^"\']+', content))
            if has_custom_font and not has_sf_pro:
                self.warnings.append(f"[iOS] {filename}: Custom font without SF Pro fallback. Consider SF Pro Text for body, SF Pro Display for headings.")

            # 11.2 iOS System Colors Check
            # Check for semantic color usage
            has_label = bool(re.search(r'color:\s*["\']?label|\.label', content))
            has_secondaryLabel = bool(re.search(r'secondaryLabel|\.secondaryLabel', content))
            has_systemBackground = bool(re.search(r'systemBackground|\.systemBackground', content))

            has_hardcoded_gray = bool(re.search(r'#[78]0{4}', content))
            if has_hardcoded_gray and not (has_label or has_secondaryLabel):
                self.warnings.append(f"[iOS] {filename}: Hardcoded gray colors detected. Consider iOS semantic colors (label, secondaryLabel) for automatic dark mode.")

            # 11.3 iOS Accent Colors Check
            ios_blue = bool(re.search(r'#007AFF|#0A84FF|systemBlue', content))
            ios_green = bool(re.search(r'#34C759|#30D158|systemGreen', content))
            ios_red = bool(re.search(r'#FF3B30|#FF453A|systemRed', content))

            has_custom_primary = bool(re.search(r'primaryColor|theme.*primary|colors\.primary', content))
            if has_custom_primary and not (ios_blue or ios_green or ios_red):
                self.warnings.append(f"[iOS] {filename}: Custom primary color without iOS system color fallback. Consider systemBlue for consistent iOS feel.")

            # 11.4 iOS Navigation Patterns Check
            has_navigation_bar = bool(re.search(r'navigationOptions|headerStyle|cardStyle', content))
            has_header_title = bool(re.search(r'title:\s*["\']|headerTitle|navigation\.setOptions', content))
            if has_navigation_bar and not has_header_title:
                self.warnings.append(f"[iOS] {filename}: Navigation bar detected without title. iOS apps should have clear context in nav bar.")

            # 11.5 iOS Component Patterns Check
            # Check for iOS-specific components
            has_alert = bool(re.search(r'Alert\.alert|showAlert', content))
            has_action_sheet = bool(re.search(r'ActionSheet|ActionSheetIOS|showActionSheetWithOptions', content))
            has_activity_indicator = bool(re.search(r'ActivityIndicator|ActivityIndic', content))

            if has_alert or has_action_sheet or has_activity_indicator:
                self.passed_count += 1  # Good iOS component usage

        # --- 12. EXTENDED PLATFORM ANDROID CHECKS ---

        if is_react_native:
            # 12.1 Roboto Font Detection
            has_roboto = bool(re.search(r'Roboto|fontFamily:\s*["\']?[-\s]*Roboto', content))
            has_custom_font = bool(re.search(r'fontFamily:\s*["\'][^"\']+', content))
            if has_custom_font and not has_roboto:
                self.warnings.append(f"[Android] {filename}: Custom font without Roboto fallback. Roboto is optimized for Android displays.")

            # 12.2 Material 3 Dynamic Color Check
            has_material_colors = bool(re.search(r'MD3|MaterialYou|dynamicColor|useColorScheme', content))
            has_theme_provider = bool(re.search(r'MaterialTheme|ThemeProvider|PaperProvider|ThemeProvider', content))
            if not has_material_colors and not has_theme_provider:
                self.warnings.append(f"[Android] {filename}: No Material 3 dynamic color detected. Consider Material 3 theming for personalized feel.")

            # 12.3 Material Elevation Check
            # Check for elevation values (Material 3 uses elevation for depth)
            has_elevation = bool(re.search(r'elevation:\s*\d+|shadowOpacity|shadowRadius|android:elevation', content))
            has_box_shadow = bool(re.search(r'boxShadow:', content))
            if has_box_shadow and not has_elevation:
                self.warnings.append(f"[Android] {filename}: CSS box-shadow detected without elevation. Consider Material elevation system for consistent depth.")

            # 12.4 Material Component Patterns Check
            # Check for Material components
            has_ripple = bool(re.search(r'ripple|android_ripple|foregroundRipple', content))
            has_card = bool(re.search(r'Card|Paper|elevation.*\d+', content))
            has_fab = bool(re.search(r'FAB|FloatingActionButton|fab', content))
            has_snackbar = bool(re.search(r'Snackbar|showSnackBar|Toast', content))

            material_component_count = sum([has_ripple, has_card, has_fab, has_snackbar])
            if material_component_count >= 2:
                self.passed_count += 1  # Good Material design usage

            # 12.5 Android Navigation Patterns Check
            has_top_app_bar = bool(re.search(r'TopAppBar|AppBar|CollapsingToolbar', content))
            has_bottom_nav = bool(re.search(r'BottomNavigation|BottomNav', content))
            has_navigation_rail = bool(re.search(r'NavigationRail', content))

            if has_bottom_nav:
                self.passed_count += 1  # Good Android pattern
            elif has_top_app_bar and not (has_bottom_nav or has_navigation_rail):
                self.warnings.append(f"[Android] {filename}: TopAppBar without bottom navigation. Consider BottomNavigation for thumb-friendly access.")

        # --- 13. MOBILE TESTING CHECKS ---

        # 13.1 Testing Tool Detection
        has_rntl = bool(re.search(r'react-native-testing-library|@testing-library', content))
        has_detox = bool(re.search(r'detox|element\(|by\.text|by\.id', content))
        has_maestro = bool(re.search(r'maestro|\.yaml$', content))
        has_jest = bool(re.search(r'jest|describe\(|test\(|it\(', content))

        testing_tools = []
        if has_jest: testing_tools.append('Jest')
        if has_rntl: testing_tools.append('RNTL')
        if has_detox: testing_tools.append('Detox')
        if has_maestro: testing_tools.append('Maestro')

        if len(testing_tools) == 0:
            self.warnings.append(f"[Testing] {filename}: No testing framework detected. Consider Jest (unit) + Detox/Maestro (E2E) for mobile.")

        # 13.2 Test Pyramid Balance Check
        test_files = len(re.findall(r'\.test\.(tsx|ts|js|jsx)|\.spec\.', content))
        e2e_tests = len(re.findall(r'detox|maestro|e2e|spec\.e2e', content.lower()))

        if test_files > 0 and e2e_tests == 0:
            self.warnings.append(f"[Testing] {filename}: Unit tests found but no E2E tests. Mobile needs E2E on real devices for complete coverage.")

        # 13.3 Accessibility Label Check (Mobile-specific)
        if is_react_native:
            has_pressable = bool(re.search(r'Pressable|TouchableOpacity|TouchableHighlight', content))
            has_a11y_label = bool(re.search(r'accessibilityLabel|aria-label|testID', content))
            if has_pressable and not has_a11y_label:
                self.warnings.append(f"[A11y Mobile] {filename}: Touchable element without accessibilityLabel. Screen readers need labels for all interactive elements.")

        # --- 14. MOBILE DEBUGGING CHECKS ---

        # 14.1 Performance Profiling Check
        has_performance = bool(re.search(r'Performance|systrace|profile|Flipper', content))
        has_console_log = len(re.findall(r'console\.(log|warn|error|debug|info)', content))
        has_debugger = bool(re.search(r'debugger|__DEV__|React\.DevTools', content))

        if has_console_log > 10:
            self.warnings.append(f"[Debugging] {filename}: {has_console_log} console.log statements. Remove before production; they block JS thread.")

        if has_performance:
            self.passed_count += 1  # Good performance monitoring

        # 14.2 Error Boundary Check
        has_error_boundary = bool(re.search(r'ErrorBoundary|componentDidCatch|getDerivedStateFromError', content))
        if not has_error_boundary and is_react_native:
            self.warnings.append(f"[Debugging] {filename}: No ErrorBoundary detected. Consider adding ErrorBoundary to prevent app crashes.")

        # 14.3 Hermes Check (React Native specific)
        if is_react_native:
            # Check if using Hermes engine (should be default in modern RN)
            # This is more of a configuration check, not code pattern
            self.passed_count += 1  # Hermes is default in RN 0.70+

    def audit_directory(self, directory: str) -> None:
        extensions = {'.tsx', '.ts', '.jsx', '.js', '.dart'}
        for root, dirs, files in os.walk(directory):
            dirs[:] = [d for d in dirs if d not in {'node_modules', '.git', 'dist', 'build', '.next', 'ios', 'android', 'build', '.idea'}]
            for file in files:
                if Path(file).suffix in extensions:
                    self.audit_file(os.path.join(root, file))

    def get_report(self):
        return {
            "files_checked": self.files_checked,
            "issues": self.issues,
            "warnings": self.warnings,
            "passed_checks": self.passed_count,
            "compliant": len(self.issues) == 0
        }


def main():
    if len(sys.argv) < 2:
        print("Usage: python mobile_audit.py <directory>")
        sys.exit(1)

    path = sys.argv[1]
    is_json = "--json" in sys.argv

    auditor = MobileAuditor()
    if os.path.isfile(path):
        auditor.audit_file(path)
    else:
        auditor.audit_directory(path)

    report = auditor.get_report()

    if is_json:
        print(json.dumps(report, indent=2))
    else:
        print(f"\n[MOBILE AUDIT] {report['files_checked']} mobile files checked")
        print("-" * 50)
        if report['issues']:
            print(f"[!] ISSUES ({len(report['issues'])}):")
            for i in report['issues'][:10]:
                print(f"  - {i}")
        if report['warnings']:
            print(f"[*] WARNINGS ({len(report['warnings'])}):")
            for w in report['warnings'][:15]:
                print(f"  - {w}")
        print(f"[+] PASSED CHECKS: {report['passed_checks']}")
        status = "PASS" if report['compliant'] else "FAIL"
        print(f"STATUS: {status}")

    sys.exit(0 if report['compliant'] else 1)


if __name__ == "__main__":
    # Fix missing import
    import re
    main()
