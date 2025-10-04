import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function CustomDropdown({ 
  options, 
  selectedValue, 
  onValueChange, 
  placeholder = 'Select an option',
  style,
  dropdownStyle,
  optionStyle,
  selectedOptionStyle,
  textStyle,
  selectedTextStyle,
  iconColor = '#FFD6F2',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  selectedBackgroundColor = 'rgba(255, 214, 242, 0.15)',
  borderColor = 'rgba(255, 214, 242, 0.3)',
  renderOption,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const selectedOption = options.find(opt => opt.id === selectedValue);

  const openDropdown = () => {
    setIsOpen(true);
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const closeDropdown = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setIsOpen(false));
  };

  const selectOption = (option) => {
    onValueChange(option.id);
    closeDropdown();
  };

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          { backgroundColor, borderColor },
          style,
        ]}
        onPress={openDropdown}
        activeOpacity={0.7}
      >
        <View style={styles.dropdownButtonContent}>
          {selectedOption ? (
            renderOption ? (
              renderOption(selectedOption, true)
            ) : (
              <View style={styles.selectedContent}>
                <Text style={[styles.selectedLabel, textStyle]}>
                  {selectedOption.label}
                </Text>
                {selectedOption.description && (
                  <Text style={[styles.selectedDescription, textStyle]}>
                    {selectedOption.description}
                  </Text>
                )}
              </View>
            )
          ) : (
            <Text style={[styles.placeholder, textStyle]}>{placeholder}</Text>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }) }] }}>
          <Ionicons name="chevron-down" size={20} color={iconColor} />
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={closeDropdown}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={closeDropdown}
        >
          <Animated.View 
            style={[
              styles.dropdownModal,
              dropdownStyle,
              {
                opacity,
                transform: [{ scale }],
              },
            ]}
          >
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Option</Text>
              <TouchableOpacity onPress={closeDropdown} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFD6F2" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.optionsContainer}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option, index) => {
                const isSelected = option.id === selectedValue;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                      isSelected && selectedOptionStyle,
                      optionStyle,
                      index === options.length - 1 && styles.lastOption,
                    ]}
                    onPress={() => selectOption(option)}
                    activeOpacity={0.7}
                  >
                    {renderOption ? (
                      renderOption(option, isSelected)
                    ) : (
                      <>
                        <View style={styles.optionContent}>
                          <Text style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                            isSelected && selectedTextStyle,
                          ]}>
                            {option.label}
                          </Text>
                          {option.description && (
                            <Text style={[
                              styles.optionDescription,
                              isSelected && styles.optionDescriptionSelected,
                            ]}>
                              {option.description}
                            </Text>
                          )}
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color="#FFD6F2" />
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 56,
  },
  dropdownButtonContent: {
    flex: 1,
    marginRight: 12,
  },
  selectedContent: {
    gap: 2,
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFE8FF',
  },
  selectedDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  placeholder: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModal: {
    backgroundColor: 'rgba(31, 17, 71, 0.98)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 242, 0.3)',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 214, 242, 0.2)',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFE8FF',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    padding: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lastOption: {
    marginBottom: 0,
  },
  optionSelected: {
    backgroundColor: 'rgba(255, 214, 242, 0.15)',
    borderColor: '#FFD6F2',
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFE8FF',
  },
  optionLabelSelected: {
    color: '#FFD6F2',
  },
  optionDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  optionDescriptionSelected: {
    color: 'rgba(255, 214, 242, 0.8)',
  },
});
