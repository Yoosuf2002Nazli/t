import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as ExpoImage } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle2, FileText, History as HistoryIcon, Image, PieChart as PieChartIcon, PlusCircle, ScanLine, Trash2, Upload, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Platform, Image as RNImage, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import tw from 'twrnc';

import CameraScanner from '../components/CameraScanner';
import Dashboard from '../components/Dashboard';
import { analyzeReceipt } from '../services/geminiService';
import * as storage from '../services/storageService';
import { Category, GalleryImage, Receipt } from '../types';

const STORAGE_KEY = 'receipt_app_pro_v5_data';

export default function App() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState(20000);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gallery' | 'history'>('dashboard');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [tempBudget, setTempBudget] = useState('20000');

  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setReceipts(parsed.receipts || []);
          setMonthlyBudget(parsed.monthlyBudget || 20000);
        }

        const images = await storage.getAllGalleryImages();
        setGalleryImages(images.sort((a, b) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ receipts, monthlyBudget }));
  }, [receipts, monthlyBudget]);

  const processImage = async (imageObj: GalleryImage) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const data = await analyzeReceipt(imageObj.base64);

      if (!data.isReadable) {
        setAnalysisError("Could not read receipt details. You can try again or enter manually.");
        setTimeout(() => setAnalysisError(null), 5000);
        return;
      }

      const parsedStoreName = data.storeName || 'Unknown Store';
      const parsedDate = data.date || new Date().toISOString().split('T')[0];
      const parsedTotal = data.total || 0;

      const isDuplicate = receipts.some(r => r.storeName === parsedStoreName && r.date === parsedDate && r.total === parsedTotal);

      if (isDuplicate) {
        setAnalysisError("Duplicate receipt detected! It is already in your Archive.");
        setTimeout(() => setAnalysisError(null), 4000);

        const updatedImg = { ...imageObj, isProcessed: true };
        await storage.saveGalleryImage(updatedImg);
        setGalleryImages(prev => prev.map(img => img.id === imageObj.id ? updatedImg : img));
        return;
      }

      const newReceipt: Receipt = {
        id: Math.random().toString(36).substr(2, 9),
        storeName: parsedStoreName,
        date: parsedDate,
        time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        items: data.items || [],
        total: parsedTotal,
        category: (data.category as Category) || Category.Other,
        timestamp: Date.now(),
        galleryImageId: imageObj.id
      };

      const updatedImg = { ...imageObj, isProcessed: true, linkedReceiptId: newReceipt.id };
      await storage.saveGalleryImage(updatedImg);

      setGalleryImages(prev => prev.map(img => img.id === imageObj.id ? updatedImg : img));
      setReceipts(prev => [newReceipt, ...prev]);
      setActiveTab('history');
    } catch (error: any) {
      const msg = error?.message || "Network Error. Receipt saved in Vault. Tap Scan button later.";
      setAnalysisError(msg);
      setTimeout(() => setAnalysisError(null), 6000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCapture = async (fileUri: string) => {
    setShowScanner(false);
    setIsFabOpen(false);

    try {
      setAnalysisError("Compressing image...");

      const smallImage = await ImageManipulator.manipulateAsync(
        fileUri,
        [{ resize: { width: 800 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      setAnalysisError(null);

      const base64Str = smallImage.base64 || '';
      const newImg: GalleryImage = {
        id: Math.random().toString(36).substr(2, 9),
        base64: base64Str,
        timestamp: Date.now(),
        isProcessed: false
      };

      try {
        await storage.saveGalleryImage(newImg);
        setGalleryImages(prev => [newImg, ...prev].sort((a, b) => b.timestamp - a.timestamp));
        setActiveTab('gallery');
        // For mobile, maybe we always assume we're online, or add netinfo check.
        await processImage(newImg);
      } catch (e) {
        setAnalysisError("Failed to save or process image in gallery.");
      }
    } catch (error) {
      setAnalysisError("Failed to compress image.");
    }
  };

  const handleFileUpload = async () => {
    setIsFabOpen(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0].uri) {
        handleCapture(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Image picker error", error);
    }
  };

  const deleteGalleryItem = async (id: string) => {
    Alert.alert("Delete Target", "Are you sure you want to delete this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          await storage.deleteGalleryImage(id);
          setGalleryImages(prev => prev.filter(img => img.id !== id));
        }
      }
    ]);
  };

  const clearAllGallery = async () => {
    Alert.alert("Empty Vault", "Delete all images in the vault? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete All", style: "destructive", onPress: async () => {
          for (const img of galleryImages) {
            await storage.deleteGalleryImage(img.id);
          }
          setGalleryImages([]);
        }
      }
    ]);
  };

  const deleteReceipt = (id: string) => {
    Alert.alert("Delete Bill", "Delete this bill?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () => {
          setReceipts(prev => prev.filter(r => r.id !== id));
        }
      }
    ]);
  };

  const clearAllReceipts = () => {
    Alert.alert("Clear Archive", "Delete all spending records? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All", style: "destructive", onPress: () => {
          setReceipts([]);
        }
      }
    ]);
  };

  const changeBudget = () => {
    setTempBudget(monthlyBudget.toString());
    setShowBudgetModal(true);
  };

  return (
    <SafeAreaView style={[tw`flex-1 bg-slate-950 font-sans`, { paddingTop: Platform.OS === 'android' ? 25 : 0 }]}>
      {/* Header */}
      <View style={tw`bg-slate-900/60 p-4 border-b border-slate-800 flex-row justify-between items-center z-30`}>
        <View style={tw`flex-row items-center gap-3`}>
          <View style={tw`w-10 h-10 bg-purple-600 rounded-xl items-center justify-center shadow-lg shadow-purple-500/20`}>
            <ScanLine color="#fff" size={24} />
          </View>
          <Text style={tw`text-xl font-bold tracking-tight text-white`}>SmartScan Pro</Text>
        </View>
        <TouchableOpacity
          onPress={changeBudget}
          style={tw`px-4 py-2 bg-slate-800 border border-slate-700 rounded-full`}
        >
          <Text style={tw`text-xs font-semibold text-white`}>Budget: Rs. {monthlyBudget.toLocaleString()}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={tw`flex-1`}>
        {analysisError && (
          <View style={tw`mx-4 mt-4 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex-row items-center justify-between`}>
            <Text style={tw`text-sm font-medium text-indigo-400 flex-1 mr-2`}>{analysisError}</Text>
            <TouchableOpacity onPress={() => setAnalysisError(null)}>
              <X color="#818cf8" size={20} />
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'dashboard' && <Dashboard receipts={receipts} monthlyBudget={monthlyBudget} />}

        {activeTab === 'gallery' && (
          <ScrollView style={tw`flex-1 px-4 py-6`} contentContainerStyle={{ paddingBottom: 150 }}>
            <View style={tw`flex-row justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800/50 mb-6`}>
              <View>
                <View style={tw`flex-row items-center gap-2 mb-1`}>
                  <View style={tw`w-2 h-2 rounded-full bg-indigo-400`} />
                  <Text style={tw`text-lg font-bold text-white`}>Image Vault</Text>
                </View>
                <Text style={tw`text-[10px] text-slate-500 font-bold uppercase tracking-widest`}>
                  {galleryImages.length} Photos total • {galleryImages.filter(i => !i.isProcessed).length} Unprocessed
                </Text>
              </View>
              <TouchableOpacity
                onPress={clearAllGallery}
                disabled={galleryImages.length === 0}
                style={[tw`px-3 py-1.5 rounded-lg`, galleryImages.length === 0 && { opacity: 0.3 }]}
              >
                <Text style={tw`text-xs font-bold text-red-500`}>Empty Vault</Text>
              </TouchableOpacity>
            </View>

            <View style={tw`flex-row flex-wrap justify-between pt-2`}>
              {galleryImages.length === 0 ? (
                <View style={tw`w-full py-24 bg-slate-900/40 rounded-3xl border border-slate-800 border-dashed items-center`}>
                  <View style={tw`w-16 h-16 bg-slate-800 rounded-full items-center justify-center mb-4`}>
                    <Image color="#64748b" size={32} />
                  </View>
                  <Text style={tw`text-slate-500 text-sm font-medium`}>Your vault is empty.</Text>
                </View>
              ) : (
                galleryImages.map(img => {
                  const cardWidth = (Dimensions.get('window').width - 48) / 2;
                  const cardHeight = cardWidth * (4 / 3);
                  return (
                    <View key={img.id} style={[tw`relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl mb-4`, { width: cardWidth, height: cardHeight }]}>
                      {img.base64 && img.base64.length > 50 ? (
                        <RNImage
                          source={{ uri: img.base64.startsWith('data:') ? img.base64 : `data:image/jpeg;base64,${img.base64.replace(/\n/g, '')}` }}
                          style={{ width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover' }}
                        />
                      ) : (
                        <View style={{ width: '100%', height: '100%', backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: 'white', fontWeight: 'bold' }}>No Data</Text>
                        </View>
                      )}

                      {!img.isProcessed ? (
                        <View style={[StyleSheet.absoluteFill, tw`bg-slate-950/60 items-center justify-center p-4`]}>
                          <TouchableOpacity
                            disabled={isAnalyzing}
                            onPress={() => processImage(img)}
                            style={tw`w-14 h-14 bg-white rounded-full items-center justify-center shadow-2xl`}
                          >
                            <ScanLine color="#4f46e5" size={24} />
                          </TouchableOpacity>
                          <Text style={tw`text-white text-[10px] font-bold mt-2 bg-indigo-500/80 px-2 py-1 rounded-full overflow-hidden text-center`}>Tap to Scan</Text>
                        </View>
                      ) : (
                        <View style={tw`absolute top-2 right-2 bg-emerald-500 flex-row px-2 py-0.5 rounded-full shadow-md items-center`}>
                          <CheckCircle2 color="#fff" size={12} />
                          <Text style={tw`text-[10px] font-black text-white ml-1`}>Done</Text>
                        </View>
                      )}

                      <TouchableOpacity
                        onPress={() => deleteGalleryItem(img.id)}
                        style={tw`absolute bottom-2 right-2 p-2 bg-red-500/80 rounded-lg`}
                      >
                        <Trash2 color="#fff" size={16} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        )}

        {activeTab === 'history' && (
          <ScrollView style={tw`flex-1 px-4 py-6`} contentContainerStyle={{ paddingBottom: 150 }}>
            <View style={tw`flex-row justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800/50 mb-6`}>
              <View style={tw`flex-row items-center gap-2`}>
                <View style={tw`w-2 h-2 rounded-full bg-purple-500`} />
                <Text style={tw`text-lg font-bold text-white`}>Bill Archive</Text>
              </View>
              <TouchableOpacity
                onPress={clearAllReceipts}
                disabled={receipts.length === 0}
                style={[tw`px-3 py-1.5 rounded-lg`, receipts.length === 0 && { opacity: 0.3 }]}
              >
                <Text style={tw`text-xs font-bold text-red-500`}>Clear Archive</Text>
              </TouchableOpacity>
            </View>

            {receipts.length === 0 ? (
              <View style={tw`py-24 bg-slate-900/40 rounded-3xl border border-slate-800 border-dashed items-center`}>
                <FileText color="#64748b" size={32} style={tw`mb-4`} />
                <Text style={tw`text-slate-500 text-sm font-medium`}>No spending recorded in archive.</Text>
              </View>
            ) : (
              <View style={tw`gap-6`}>
                {receipts.map(receipt => {
                  const linkedImg = galleryImages.find(img => img.id === receipt.galleryImageId);
                  return (
                    <View key={receipt.id} style={tw`bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-lg`}>
                      <TouchableOpacity
                        onPress={() => deleteReceipt(receipt.id)}
                        style={tw`absolute top-4 right-4 p-2`}
                      >
                        <X color="#ef4444" size={20} opacity={0.5} />
                      </TouchableOpacity>

                      <View style={tw`flex-row justify-between mb-4 pr-8`}>
                        <View style={tw`flex-1`}>
                          <Text style={tw`font-bold text-slate-100 text-xl`} numberOfLines={1}>{receipt.storeName}</Text>
                          <View style={tw`flex-row gap-2 mt-1`}>
                            <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-widest`}>{receipt.date} • {receipt.time}</Text>
                          </View>
                        </View>
                        {linkedImg && (
                          <ExpoImage
                            source={{ uri: `data:image/jpeg;base64,${linkedImg.base64.replace(/\n/g, '')}` }}
                            style={tw`w-12 h-16 rounded-lg ml-2 border border-slate-700`}
                            contentFit="cover"
                          />
                        )}
                      </View>

                      <View style={tw`gap-2 mb-6`}>
                        {receipt.items.map((item, idx) => (
                          <View key={idx} style={tw`flex-row justify-between items-center bg-slate-800/30 p-3 rounded-xl border border-slate-700/20`}>
                            <View style={tw`flex-col flex-1`}>
                              <Text style={tw`text-sm text-slate-200 font-semibold`} numberOfLines={1}>{item.name}</Text>
                              <Text style={tw`text-[9px] uppercase font-black text-indigo-400 mt-1`}>{item.category || Category.Other}</Text>
                            </View>
                            <Text style={tw`text-sm font-bold text-slate-100`}>Rs. {item.price.toFixed(2)}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={tw`pt-4 border-t border-slate-800/50 flex-row justify-between items-center`}>
                        <Text style={tw`text-[10px] font-black uppercase tracking-widest text-slate-500`}>Total</Text>
                        <Text style={tw`text-2xl font-black text-white`}>Rs. {receipt.total.toLocaleString()}</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* FAB Overlay */}
      {isFabOpen && <TouchableOpacity activeOpacity={1} style={[tw`absolute inset-0 bg-slate-950/80 z-[55]`]} onPress={() => setIsFabOpen(false)} />}

      {/* Speed Dial FAB */}
      <View style={tw`absolute bottom-28 self-center items-center z-[60]`}>
        {isFabOpen && (
          <View style={tw`items-center mb-4`}>
            <TouchableOpacity
              onPress={handleFileUpload}
              style={tw`flex-row items-center bg-slate-900 border border-slate-700 px-5 py-3 rounded-2xl shadow-xl mb-3 w-48`}
            >
              <View style={tw`w-10 h-10 bg-indigo-500/20 rounded-xl items-center justify-center mr-3`}>
                <Upload color="#818cf8" size={20} />
              </View>
              <Text style={tw`text-xs font-black uppercase tracking-widest text-slate-300`}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setShowScanner(true); setIsFabOpen(false); }}
              style={tw`flex-row items-center bg-slate-900 border border-slate-700 px-5 py-3 rounded-2xl shadow-xl w-48`}
            >
              <View style={tw`w-10 h-10 bg-purple-500/20 rounded-xl items-center justify-center mr-3`}>
                <Camera color="#c084fc" size={20} />
              </View>
              <Text style={tw`text-xs font-black uppercase tracking-widest text-slate-300`}>Camera</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={() => setIsFabOpen(!isFabOpen)}
          style={[tw`w-16 h-16 bg-purple-600 rounded-full items-center justify-center shadow-2xl`, isFabOpen && { transform: [{ rotate: '45deg' }] }]}
        >
          <PlusCircle color="#fff" size={32} />
        </TouchableOpacity>
      </View>

      {/* Bottom Nav */}
      <View style={tw`absolute bottom-0 left-0 right-0 items-center z-50`}>
        <View style={tw`w-full bg-slate-900/90 border-t border-slate-800 px-10 py-5 flex-row justify-between items-center`}>
          <TouchableOpacity onPress={() => setActiveTab('dashboard')} style={tw`items-center`}>
            <PieChartIcon color={activeTab === 'dashboard' ? "#818cf8" : "#64748b"} size={24} style={tw`mb-1`} />
            <Text style={[tw`text-[9px] font-black uppercase tracking-widest`, activeTab === 'dashboard' ? tw`text-indigo-400` : tw`text-slate-500`]}>Analytics</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('gallery')} style={tw`items-center`}>
            <Image color={activeTab === 'gallery' ? "#818cf8" : "#64748b"} size={24} style={tw`mb-1`} />
            <Text style={[tw`text-[9px] font-black uppercase tracking-widest`, activeTab === 'gallery' ? tw`text-indigo-400` : tw`text-slate-500`]}>Vault</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('history')} style={tw`items-center`}>
            <HistoryIcon color={activeTab === 'history' ? "#818cf8" : "#64748b"} size={24} style={tw`mb-1`} />
            <Text style={[tw`text-[9px] font-black uppercase tracking-widest`, activeTab === 'history' ? tw`text-indigo-400` : tw`text-slate-500`]}>Archive</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      {showScanner && <CameraScanner onCapture={handleCapture} onClose={() => setShowScanner(false)} />}

      {isAnalyzing && (
        <View style={tw`absolute inset-0 z-[1000] bg-slate-950/80 items-center justify-center`}>
          <ActivityIndicator size="large" color="#4f46e5" style={tw`mb-6 transform scale-150`} />
          <Text style={tw`text-lg font-black tracking-widest text-indigo-300 uppercase`}>Scanning...</Text>
          <Text style={tw`text-slate-500 text-sm mt-2`}>Extracting data using Gemini AI</Text>
        </View>
      )}

      {showBudgetModal && (
        <View style={tw`absolute inset-0 z-[1100] bg-slate-950/90 items-center justify-center px-6`}>
          <View style={tw`bg-slate-900 w-full p-6 rounded-3xl border border-slate-800 shadow-2xl`}>
            <Text style={tw`text-2xl font-black text-white mb-2 tracking-tight`}>Set Budget</Text>
            <Text style={tw`text-slate-400 text-xs font-bold uppercase tracking-widest mb-6`}>Target Monthly Spending</Text>

            <View style={tw`bg-slate-950 border border-slate-800 rounded-2xl p-4 mb-6 flex-row items-center`}>
              <Text style={tw`text-slate-500 font-bold mr-2 text-lg`}>Rs.</Text>
              <TextInput
                value={tempBudget}
                onChangeText={setTempBudget}
                keyboardType="numeric"
                autoFocus
                style={tw`flex-1 text-white text-2xl font-black h-12`}
                placeholderTextColor="#475569"
                placeholder="0.00"
              />
            </View>

            <View style={tw`flex-row justify-end gap-3`}>
              <TouchableOpacity onPress={() => setShowBudgetModal(false)} style={tw`px-6 py-3 rounded-xl`}>
                <Text style={tw`text-slate-400 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const num = Number(tempBudget);
                  if (!isNaN(num) && num > 0) setMonthlyBudget(num);
                  setShowBudgetModal(false);
                }}
                style={tw`bg-purple-600 px-8 py-3 rounded-xl shadow-lg`}
              >
                <Text style={tw`text-white font-black uppercase text-xs tracking-widest`}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
