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
import { AppProvider } from './src/context/AppContext';
import { ShopOrderScreen } from './src/screens/ShopOrderScreen';
import { OrderHistoryScreen } from './src/screens/OrderHistoryScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';

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

type Tab = 'new_order' | 'history' | 'products';

function MainContent() {
  const [activeTab, setActiveTab] = useState<Tab>('new_order');

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
            <Ionicons name="cart" size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.brandTitle}>QuickBill</Text>
            <Text style={styles.brandSubtitle}>Shop Order & Vendor Manager</Text>
          </View>
        </View>

        <View style={styles.currencyBadge}>
          <Text style={styles.currencyText}>Shop Order</Text>
        </View>
      </View>

      {/* Tab Navigation Buttons (Android Standard Glass Capsule Switcher) */}
      <View style={styles.tabNavContainer}>
        <View style={styles.glassTabBar}>
          <TouchableOpacity
            style={[styles.glassTabItem, activeTab === 'new_order' && styles.glassTabItemActive]}
            onPress={() => setActiveTab('new_order')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'new_order' ? 'cart' : 'cart-outline'}
              size={17}
              color={activeTab === 'new_order' ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.glassTabText,
                activeTab === 'new_order' && styles.glassTabTextActive,
              ]}
            >
              New Order
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassTabItem, activeTab === 'history' && styles.glassTabItemActive]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'history' ? 'time' : 'time-outline'}
              size={17}
              color={activeTab === 'history' ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.glassTabText,
                activeTab === 'history' && styles.glassTabTextActive,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassTabItem, activeTab === 'products' && styles.glassTabItemActive]}
            onPress={() => setActiveTab('products')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'products' ? 'pricetags' : 'pricetags-outline'}
              size={17}
              color={activeTab === 'products' ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.glassTabText,
                activeTab === 'products' && styles.glassTabTextActive,
              ]}
            >
              Products
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Content */}
      <View style={styles.content}>
        {activeTab === 'new_order' && <ShopOrderScreen />}
        {activeTab === 'history' && <OrderHistoryScreen />}
        {activeTab === 'products' && <ProductsScreen />}
      </View>
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
        <ActivityIndicator size="large" color="#0f172a" />
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
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 500,
          width: '100%',
          alignSelf: 'center' as const,
        }
      : {}),
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
    backgroundColor: '#0f172a',
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
  tabNavContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  glassTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(241, 245, 249, 0.88)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.65)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  glassTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  glassTabItemActive: {
    backgroundColor: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  glassTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  glassTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#0f172a',
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
