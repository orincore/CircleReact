import React, { useState } from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CustomerSupportScreen from '../app/settings/customer-support'

const CustomerSupportButton = ({ style }) => {
  const [showSupport, setShowSupport] = useState(false)

  return (
    <>
      <TouchableOpacity 
        style={[styles.supportButton, style]} 
        onPress={() => setShowSupport(true)}
      >
        <Ionicons name="headset-outline" size={20} color="#7C2B86" />
        <Text style={styles.supportText}>Customer Support</Text>
        <Ionicons name="chevron-forward" size={16} color="#666" />
      </TouchableOpacity>

      {showSupport && (
        <CustomerSupportScreen 
          visible={showSupport}
          onClose={() => setShowSupport(false)}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  supportText: {
    flex: 1,
    fontSize: 16,
    color: '#1F1147',
    marginLeft: 12,
    fontWeight: '500',
  },
})

export default CustomerSupportButton
