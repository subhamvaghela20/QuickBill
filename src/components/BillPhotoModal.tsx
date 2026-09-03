import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  ScannedBillItem,
  getSavedApiKey,
  parseBillPhotoWithAI,
  saveApiKey,
} from '../services/billScannerService';
import { formatINR, formatWeight } from '../utils/formatters';

interface BillPhotoModalProps {
  visible: boolean;
  onClose: () => void;
  onImportItems: (items: { productName: string; quantityKg: number; ratePerKg: number; totalAmount: number }[]) => void;
}

export const BillPhotoModal: React.FC<BillPhotoModalProps> = ({
  visible,
  onClose,
  onImportItems,
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ScannedBillItem[]>([]);

  useEffect(() => {
    if (visible) {
      getSavedApiKey().then((k) => {
        setApiKey(k);
        if (!k) setShowKeyInput(true);
      });
      // Reset state on open if no active scan
      if (extractedItems.length === 0) {
        setImageUri(null);
        setImageBase64(null);
      }
    }
  }, [visible]);

  // Launch Camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to photograph bills.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64 || null);
        setExtractedItems([]);
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      Alert.alert('Error', 'Failed to open camera.');
    }
  };

  // Launch Gallery / Library
  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Gallery permission is needed to select bill photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64 || null);
        setExtractedItems([]);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to open gallery.');
    }
  };

  // Scan with AI
  const handleStartScan = async () => {
    if (!imageBase64) {
      Alert.alert('No Image', 'Please capture or select a bill photo first.');
      return;
    }

    setIsScanning(true);
    const result = await parseBillPhotoWithAI(imageBase64, apiKey);
    setIsScanning(false);

    if (result.success && result.items.length > 0) {
      setExtractedItems(result.items);
    } else {
      if (result.message === 'MISSING_KEY') {
        setShowKeyInput(true);
        Alert.alert(
          'Gemini AI Key Needed',
          'To accurately recognize handwritten and computerized receipts, please paste your free Gemini Vision API key below.'
        );
      } else {
        Alert.alert('Scan Result', result.message || 'Could not detect items. You can add them manually or try a clearer photo.');
      }
    }
  };

  // Load sample demo data for quick review testing
  const handleLoadDemoSample = () => {
    const demoItems: ScannedBillItem[] = [
      { id: 'demo_1', productName: 'Potato (आलू)', quantityKg: 5, ratePerKg: 30, totalAmount: 150 },
      { id: 'demo_2', productName: 'Onion (प्याज)', quantityKg: 2.5, ratePerKg: 35, totalAmount: 87.5 },
      { id: 'demo_3', productName: 'Tomato (टमाटर)', quantityKg: 1.5, ratePerKg: 40, totalAmount: 60 },
      { id: 'demo_4', productName: 'Basmati Rice (चावल)', quantityKg: 10, ratePerKg: 85, totalAmount: 850 },
    ];
    setExtractedItems(demoItems);
  };

  // Row edits
  const handleUpdateItem = (index: number, field: keyof ScannedBillItem, val: string) => {
    const updated = [...extractedItems];
    const item = { ...updated[index] };

    if (field === 'productName') {
      item.productName = val;
    } else if (field === 'quantityKg') {
      const num = parseFloat(val) || 0;
      item.quantityKg = num;
      if (item.ratePerKg > 0) {
        item.totalAmount = Math.round(item.ratePerKg * num * 100) / 100;
      }
    } else if (field === 'ratePerKg') {
      const num = parseFloat(val) || 0;
      item.ratePerKg = num;
      if (item.quantityKg > 0) {
        item.totalAmount = Math.round(num * item.quantityKg * 100) / 100;
      }
    } else if (field === 'totalAmount') {
      const num = parseFloat(val) || 0;
      item.totalAmount = num;
      if (item.quantityKg > 0) {
        item.ratePerKg = Math.round((num / item.quantityKg) * 100) / 100;
      }
    }

    updated[index] = item;
    setExtractedItems(updated);
  };

  const handleDeleteItem = (index: number) => {
    const updated = [...extractedItems];
    updated.splice(index, 1);
    setExtractedItems(updated);
  };

  const handleAddNewItemRow = () => {
    const newItem: ScannedBillItem = {
      id: 'item_' + Date.now(),
      productName: '',
      quantityKg: 1,
      ratePerKg: 0,
      totalAmount: 0,
    };
    setExtractedItems([...extractedItems, newItem]);
  };

  // Import into main bill
  const handleImportToBill = () => {
    if (extractedItems.length === 0) {
      Alert.alert('No Items', 'There are no items to import.');
      return;
    }

    // Filter valid items
    const validItems = extractedItems.filter(
      (it) => it.productName.trim() && it.quantityKg > 0 && (it.ratePerKg > 0 || it.totalAmount > 0)
    );

    if (validItems.length === 0) {
      Alert.alert('Invalid Items', 'Please ensure products have a name, quantity, and price.');
      return;
    }

    onImportItems(validItems);
    onClose();
  };

  const grandTotal = extractedItems.reduce((acc, it) => acc + (it.totalAmount || 0), 0);
  const totalWeight = extractedItems.reduce((acc, it) => acc + (it.quantityKg || 0), 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.titleRow}>
                <Ionicons name="scan-circle" size={24} color="#0f172a" />
                <Text style={styles.title}>Scan Bill Photo</Text>
              </View>
              <Text style={styles.subtitle}>
                Extracts items from computerized & handwritten bills
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Step 1: Image Capture / Select */}
            <View style={styles.imageSection}>
              {imageUri ? (
                <View style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} />
                  <View style={styles.imageActionsOverlay}>
                    <TouchableOpacity style={styles.repickBtn} onPress={handleTakePhoto}>
                      <Ionicons name="camera" size={14} color="#ffffff" />
                      <Text style={styles.repickText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.repickBtn} onPress={handlePickFromGallery}>
                      <Ionicons name="images" size={14} color="#ffffff" />
                      <Text style={styles.repickText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.captureBox}>
                  <Ionicons name="receipt-outline" size={44} color="#0f172a" />
                  <Text style={styles.captureTitle}>Upload Physical Bill</Text>
                  <Text style={styles.captureDesc}>
                    Take a clear photo of your paper slip or computerized bill
                  </Text>
                  <View style={styles.captureButtonsRow}>
                    <TouchableOpacity style={styles.cameraBtn} onPress={handleTakePhoto}>
                      <Ionicons name="camera" size={18} color="#ffffff" />
                      <Text style={styles.cameraBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery}>
                      <Ionicons name="images-outline" size={18} color="#0f172a" />
                      <Text style={styles.galleryBtnText}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* AI Vision API Key Collapsible Box */}
            <View style={styles.apiKeySection}>
              <TouchableOpacity
                style={styles.apiKeyHeader}
                onPress={() => setShowKeyInput(!showKeyInput)}
              >
                <Ionicons name="key-outline" size={16} color="#475569" />
                <Text style={styles.apiKeyHeaderText}>
                  {apiKey ? 'AI Recognition Key Configured ✓' : 'Setup Free AI Vision Key'}
                </Text>
                <Ionicons
                  name={showKeyInput ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#64748b"
                />
              </TouchableOpacity>

              {showKeyInput && (
                <View style={styles.keyInputCard}>
                  <Text style={styles.keyDesc}>
                    Powered by Google Gemini Vision. Get a free API key instantly at{' '}
                    <Text style={{ fontWeight: '700', color: '#0f172a' }}>aistudio.google.com</Text>
                  </Text>
                  <View style={styles.keyInputRow}>
                    <TextInput
                      style={styles.keyInput}
                      placeholder="Paste Gemini API key here..."
                      placeholderTextColor="#94a3b8"
                      value={apiKey}
                      onChangeText={(k) => {
                        setApiKey(k);
                        saveApiKey(k);
                      }}
                      secureTextEntry
                    />
                  </View>
                  <TouchableOpacity style={styles.demoSampleBtn} onPress={handleLoadDemoSample}>
                    <Ionicons name="sparkles" size={14} color="#7c3aed" />
                    <Text style={styles.demoSampleText}>Load Demo Handwritten Slip to Test</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Scan Action Button */}
            {imageUri && extractedItems.length === 0 && (
              <TouchableOpacity
                style={[styles.startScanBtn, isScanning && styles.btnDisabled]}
                onPress={handleStartScan}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.startScanBtnText}>Analyzing bill photo...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#ffffff" />
                    <Text style={styles.startScanBtnText}>Scan & Extract Bill Items</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Step 2: Review & Edit Extracted Table */}
            {extractedItems.length > 0 && (
              <View style={styles.reviewSection}>
                <View style={styles.reviewHeader}>
                  <View>
                    <Text style={styles.reviewTitle}>Review & Verify Bill Info</Text>
                    <Text style={styles.reviewSubtitle}>
                      {extractedItems.length} items detected. You can edit any value below:
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.addLineBtn} onPress={handleAddNewItemRow}>
                    <Ionicons name="add" size={16} color="#0f172a" />
                    <Text style={styles.addLineBtnText}>Add Row</Text>
                  </TouchableOpacity>
                </View>

                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.colHeader, { flex: 2.5 }]}>Product Name</Text>
                  <Text style={[styles.colHeader, { flex: 1.3, textAlign: 'center' }]}>Qty (kg)</Text>
                  <Text style={[styles.colHeader, { flex: 1.4, textAlign: 'center' }]}>Rate/kg</Text>
                  <Text style={[styles.colHeader, { flex: 1.5, textAlign: 'right' }]}>Total (₹)</Text>
                  <View style={{ width: 28 }} />
                </View>

                {/* Items Rows */}
                {extractedItems.map((item, index) => (
                  <View key={item.id || index} style={styles.tableRow}>
                    {/* Product Name */}
                    <TextInput
                      style={[styles.tableInput, { flex: 2.5, fontWeight: '700' }]}
                      placeholder="Product"
                      value={item.productName}
                      onChangeText={(val) => handleUpdateItem(index, 'productName', val)}
                    />

                    {/* Qty (kg) */}
                    <TextInput
                      style={[styles.tableInput, { flex: 1.3, textAlign: 'center' }]}
                      placeholder="Qty"
                      keyboardType="numeric"
                      value={item.quantityKg ? item.quantityKg.toString() : ''}
                      onChangeText={(val) => handleUpdateItem(index, 'quantityKg', val)}
                    />

                    {/* Rate/kg */}
                    <TextInput
                      style={[styles.tableInput, { flex: 1.4, textAlign: 'center' }]}
                      placeholder="₹/kg"
                      keyboardType="numeric"
                      value={item.ratePerKg ? item.ratePerKg.toString() : ''}
                      onChangeText={(val) => handleUpdateItem(index, 'ratePerKg', val)}
                    />

                    {/* Total */}
                    <TextInput
                      style={[styles.tableInput, { flex: 1.5, textAlign: 'right', fontWeight: '800', color: '#15803d' }]}
                      placeholder="₹ Total"
                      keyboardType="numeric"
                      value={item.totalAmount ? item.totalAmount.toString() : ''}
                      onChangeText={(val) => handleUpdateItem(index, 'totalAmount', val)}
                    />

                    {/* Delete */}
                    <TouchableOpacity
                      style={styles.rowDeleteBtn}
                      onPress={() => handleDeleteItem(index)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Summary Box */}
                <View style={styles.scannedSummaryBox}>
                  <View>
                    <Text style={styles.summaryLabel}>Total Extracted Weight</Text>
                    <Text style={styles.summaryVal}>{formatWeight(totalWeight)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.summaryLabel}>Scanned Grand Total</Text>
                    <Text style={styles.summaryTotalVal}>{formatINR(grandTotal)}</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Import Action */}
          {extractedItems.length > 0 && (
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.importBtn} onPress={handleImportToBill}>
                <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                <Text style={styles.importBtnText}>Generate & Add to Bill</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  imageSection: {
    marginBottom: 12,
  },
  captureBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  captureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 10,
  },
  captureDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  captureButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  cameraBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  galleryBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  imagePreviewWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
    height: 180,
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  imageActionsOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  repickBtn: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  repickText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  apiKeySection: {
    marginBottom: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  apiKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  apiKeyHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  keyInputCard: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  keyDesc: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
  },
  keyInputRow: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    height: 38,
    justifyContent: 'center',
  },
  keyInput: {
    fontSize: 12,
    color: '#0f172a',
  },
  demoSampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  demoSampleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  startScanBtn: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  startScanBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  reviewSection: {
    marginBottom: 20,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  reviewSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 4,
  },
  addLineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginBottom: 6,
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 6,
  },
  tableInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 6,
    height: 38,
    fontSize: 13,
    color: '#0f172a',
  },
  rowDeleteBtn: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannedSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#166534',
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
    marginTop: 1,
  },
  summaryTotalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#15803d',
    marginTop: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  importBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  importBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
