import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import tw from 'twrnc';
import { X } from 'lucide-react-native';

interface CameraScannerProps {
  onCapture: (uri: string) => void;
  onClose: () => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, onClose }) => {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return <View style={tw`flex-1 bg-slate-950 items-center justify-center`} />;
  }

  if (!permission.granted) {
    return (
      <View style={tw`flex-1 bg-slate-950 items-center justify-center p-8`}>
        <View style={tw`w-16 h-16 bg-red-500/10 rounded-full items-center justify-center mb-4`}>
          <Text style={tw`text-red-500 font-bold text-xl`}>!</Text>
        </View>
        <Text style={tw`text-slate-300 text-center mb-6 font-medium leading-relaxed`}>
          Camera permission denied. Please allow camera access in your settings.
        </Text>
        <TouchableOpacity 
          onPress={requestPermission}
          style={tw`px-8 py-3 bg-purple-600 rounded-2xl shadow-lg mb-4`}
        >
          <Text style={tw`text-white font-black`}>Request Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={tw`px-8 py-3`}>
          <Text style={tw`text-slate-400 font-bold`}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const captureImage = async () => {
    if (cameraRef.current && !isProcessing) {
      setIsProcessing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
        });
        if (photo?.uri) {
          onCapture(photo.uri);
        }
      } catch (err) {
        console.error("Camera capture error:", err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, tw`bg-slate-950 flex-col z-50`]}>
      <View style={tw`p-5 pt-12 flex-row justify-between items-center bg-slate-900 border-b border-slate-800`}>
        <Text style={tw`text-slate-100 font-black text-xl tracking-tight`}>Scanner View</Text>
        <TouchableOpacity 
          onPress={onClose}
          style={tw`p-3 bg-slate-800 rounded-2xl`}
        >
          <X color="#94a3b8" size={24} />
        </TouchableOpacity>
      </View>

      <View style={tw`flex-1 bg-black items-center justify-center overflow-hidden relative`}>
        <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
        />

        {/* Viewfinder Overlay */}
        <View style={tw`absolute inset-0 items-center justify-center pointer-events-none`}>
          {/* We are doing a visual hack for the viewfinder since border-[60px] doesn't always map well in RN */}
          <View style={[tw`w-11/12 border-2 border-dashed border-purple-500 border-opacity-80 rounded-3xl relative hidden`, { aspectRatio: 3/4 }]} />
        </View>
        
        <View style={tw`absolute bottom-10 left-0 right-0 bg-black/40 py-2 items-center`}>
           <Text style={tw`text-white/50 text-sm font-bold uppercase tracking-widest`}>
              Center receipt in frame
           </Text>
        </View>
      </View>

      <View style={tw`p-10 bg-slate-900 justify-center items-center border-t border-slate-800 pb-16`}>
        <TouchableOpacity 
          onPress={captureImage}
          disabled={isProcessing}
          style={tw`w-20 h-20 bg-white rounded-full items-center justify-center shadow-2xl relative`}
        >
          <View style={tw`absolute w-24 h-24 bg-purple-600 rounded-full opacity-40`} />
          <View style={tw`w-16 h-16 rounded-full border-2 border-slate-200`} />
          {isProcessing && <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color="#9333ea" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CameraScanner;
