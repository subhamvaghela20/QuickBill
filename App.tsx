import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { AppProvider, useApp } from './src/context/AppContext';
import { NewBillScreen } from './src/screens/NewBillScreen';
import { BillHistoryScreen } from './src/screens/BillHistoryScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { ShopOrderModal } from './src/components/ShopOrderModal';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error?.message || 'Unexpected error occurred.' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleRestart = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorFallbackContainer}>
          <Ionicons name="alert-circle-outline" size={54} color="#ef4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>
            {this.state.errorMessage || 'The app encountered an unexpected error.'}
          </Text>
          <TouchableOpacity style={styles.errorRetryBtn} onPress={this.handleRestart}>
            <Text style={styles.errorRetryBtnText}>Restart QuickBill</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

type Tab = 'new_bill' | 'history' | 'products';

function MainContent() {
  const [activeTab, setActiveTab] = useState<Tab>('new_bill');
  const [isShopOrderVisible, setIsShopOrderVisible] = useState(false);
  const { activeDraftBillCount } = useApp();

  // Lift floating button when bill bottom bar (Save Bill) is visible to prevent overlap
  const isLifted = activeTab === 'new_bill' && activeDraftBillCount > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#ffffff"
        translucent={false}
      />

      {/* Top Brand Header */}
      <View style={styles.appHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Ionicons name="receipt" size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.brandTitle}>QuickBill</Text>
            <Text style={styles.brandSubtitle}>Fast Billing & Price Tracker</Text>
          </View>
        </View>

        <View style={styles.currencyBadge}>
          <Text style={styles.currencyText}>INR (₹)</Text>
        </View>
      </View>

      {/* Tab Navigation Buttons */}
      <View style={styles.tabNav}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'new_bill' && styles.tabButtonActive]}
          onPress={() => setActiveTab('new_bill')}
        >
          <Ionicons
            name={activeTab === 'new_bill' ? 'create' : 'create-outline'}
            size={18}
            color={activeTab === 'new_bill' ? '#2563eb' : '#64748b'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'new_bill' && styles.tabButtonTextActive,
            ]}
          >
            New Bill
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name={activeTab === 'history' ? 'time' : 'time-outline'}
            size={18}
            color={activeTab === 'history' ? '#2563eb' : '#64748b'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'history' && styles.tabButtonTextActive,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'products' && styles.tabButtonActive]}
          onPress={() => setActiveTab('products')}
        >
          <Ionicons
            name={activeTab === 'products' ? 'pricetags' : 'pricetags-outline'}
            size={18}
            color={activeTab === 'products' ? '#2563eb' : '#64748b'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'products' && styles.tabButtonTextActive,
            ]}
          >
            Products
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Content */}
      <View style={styles.content}>
        {activeTab === 'new_bill' && <NewBillScreen />}
        {activeTab === 'history' && <BillHistoryScreen />}
        {activeTab === 'products' && <ProductsScreen />}
      </View>

      {/* Floating Action Button at Bottom for WhatsApp Shop Order */}
      <TouchableOpacity
        style={[
          styles.floatingOrderBtn,
          isLifted && styles.floatingOrderBtnLifted,
        ]}
        onPress={() => setIsShopOrderVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.floatingIconBg}>
          <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
        </View>
        <Text style={styles.floatingOrderText}>Order for Shop</Text>
      </TouchableOpacity>

      {/* Shop Order Modal */}
      <ShopOrderModal
        visible={isShopOrderVisible}
        onClose={() => setIsShopOrderVisible(false)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  // Never block screen from opening - if fonts are loaded or if error occurs, proceed immediately
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <MainContent />
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  currencyBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#eff6ff',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  floatingOrderBtn: {
    position: 'absolute',
    bottom: 38,
    right: 18,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  floatingIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingOrderText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  floatingOrderBtnLifted: {
    bottom: 86,
  },
  errorFallbackContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorRetryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorRetryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
