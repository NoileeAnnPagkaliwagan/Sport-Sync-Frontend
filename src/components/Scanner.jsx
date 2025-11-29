import { useState, useRef, useEffect, useCallback } from "react";
import { X, Scan, Camera, ChevronDown } from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

export default function Scanner({ onScan }) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [videoInputDevices, setVideoInputDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const videoRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  // 1. Initial Setup: Fetch Devices
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const getDevices = async () => {
      try {
        const devices = await codeReader.current.listVideoInputDevices();
        if (mounted) {
            setVideoInputDevices(devices);
            if (devices.length > 0) {
                const defaultDevice = devices.find(d => d.label.toLowerCase().includes('back')) || devices[0];
                setSelectedDeviceId(defaultDevice.deviceId);
            } else {
                setErrorMsg("No camera found.");
            }
        }
      } catch (err) {
        console.error("Permission Error:", err);
        if (mounted) setErrorMsg("Camera permission denied.");
      }
    };

    getDevices();

    return () => {
      mounted = false;
      codeReader.current.reset();
    };
  }, [isOpen]);

  // 2. Start Scanning
  const startScanning = useCallback(async (deviceId) => {
    if (!deviceId || !videoRef.current) return;

    try {
      codeReader.current.reset();
      
      // Delay to ensure DOM is ready
      setTimeout(async () => {
          if (!videoRef.current) return; 

          await codeReader.current.decodeFromVideoDevice(
            deviceId,
            videoRef.current,
            (result, err) => {
              if (result) {
                // --- SUCCESS BLOCK ---
                const text = result.getText();
                console.log("Scanned:", text);
                
                // 1. Pass data to parent
                if (onScan) {
                   onScan(text);
                }

                // 2. Stop the Camera immediately
                codeReader.current.reset();

                // 3. Close the Modal
                setIsOpen(false);
              }
              
              if (err && !(err instanceof NotFoundException)) {
                // Ignore frame errors
              }
            }
          );
      }, 500);

    } catch (err) {
      console.error("Start Scan Error:", err);
      setErrorMsg("Failed to start video stream.");
    }
  }, [onScan]);

  // 3. Trigger Scan
  useEffect(() => {
    if (isOpen && selectedDeviceId) {
        startScanning(selectedDeviceId);
    }
  }, [isOpen, selectedDeviceId, startScanning]);

  return (
    <div>
      <style>{`
        @keyframes scanner-line {
          0% { top: 0; box-shadow: 0 0 4px rgba(239,68,68,0.8); }
          50% { top: 100%; box-shadow: 0 0 4px rgba(239,68,68,0.8); }
          100% { top: 0; box-shadow: 0 0 4px rgba(239,68,68,0.8); }
        }
        .animate-scanner-line {
          animation: scanner-line 2.5s linear infinite;
        }
      `}</style>

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-softWhite text-deepBlue p-3 rounded-lg border border-gray-300 hover:shadow-sm transition flex items-center justify-center"
      >
        <Scan size={20} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-charcoalBlack/90 flex items-center justify-center z-[100] px-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-sm p-4 relative space-y-4 shadow-2xl">
            
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="w-full mr-4">
                <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                    <Scan size={18} /> Scan Barcode
                </h2>
                
                {videoInputDevices.length > 0 ? (
                    <div className="relative">
                        <select 
                            className="appearance-none w-full bg-slate-100 border border-slate-200 text-slate-700 text-xs py-2 pl-3 pr-8 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#002B50]"
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                        >
                            {videoInputDevices.map((device) => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Camera ${device.deviceId.slice(0,5)}...`}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                ) : (
                    <p className="text-xs text-red-500">Searching for cameras...</p>
                )}
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Video Area */}
            <div className="relative flex flex-col items-center justify-center h-64 bg-black rounded-lg overflow-hidden ring-1 ring-slate-200">
              {errorMsg ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center z-20">
                      <Camera size={32} className="mb-2 text-red-500" />
                      <p className="text-sm font-medium">{errorMsg}</p>
                  </div>
              ) : (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
              )}

              {!errorMsg && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="w-64 h-32 border-2 border-green-400 rounded-lg relative shadow-[0_0_0_1000px_rgba(0,0,0,0.5)] overflow-hidden">
                      <div className="absolute left-0 w-full h-[2px] bg-red-500 animate-scanner-line shadow-[0_0_4px_rgba(239,68,68,1)]"></div>
                      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white -mt-px -ml-px"></div>
                      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white -mt-px -mr-px"></div>
                      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white -mb-px -ml-px"></div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white -mb-px -mr-px"></div>
                    </div>
                  </div>
              )}
            </div>

            <p className="text-xs text-center text-slate-400 font-medium">
              Select your camera above if the image is blank
            </p>
          </div>
        </div>
      )}
    </div>
  );
}