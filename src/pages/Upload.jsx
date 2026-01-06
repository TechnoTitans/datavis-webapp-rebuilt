import { useState, useRef, useEffect } from 'react'
import { supabase, supabaseConfigured } from '../supabaseClient'
import { canEditDatabase } from '../utils/permissions'
import QrScanner from 'qr-scanner'
import { approveUnconfirmedData, insertUnconfirmedData, rejectUnconfirmedData } from '../utils/offlineMutations'
import { toast } from 'sonner'

function Upload() {
  const [isScanning, setIsScanning] = useState(false)
  const [parsedData, setParsedData] = useState(null)
  const [message, setMessage] = useState('')
  const [unconfirmedData, setUnconfirmedData] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const videoRef = useRef(null)
  const qrScannerRef = useRef(null)

  useEffect(() => {
    setIsAuthenticated(canEditDatabase())
    
    const checkPermissions = () => {
      setIsAuthenticated(canEditDatabase())
    }
    
    window.addEventListener('storage', checkPermissions)
    return () => window.removeEventListener('storage', checkPermissions)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnconfirmedData()
    }
  }, [isAuthenticated])

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  const fetchUnconfirmedData = async () => {
    if (!supabaseConfigured || !supabase) {
      setUnconfirmedData([])
      return
    }
    try {
      const { data, error } = await supabase
        .from('unconfirmed_data')
        .select('*')

      if (error) {
        throw error
      }
      
      setUnconfirmedData(data || [])
    } catch (error) {
      console.error('Error fetching unconfirmed data:', error)
      setMessage(`Error fetching data: ${error.message}`)
    }
  }

  const startScanning = async () => {
    try {
      setIsScanning(true)
      setMessage('Starting QR scanner...')
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (!videoRef.current) {
        throw new Error('Video element not available')
      }
      
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
        qrScannerRef.current = null
      }
      
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        result => {
          parseQRData(result.data)
          stopScanning()
        },
        {
          onDecodeError: () => {
          },
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      )
      
      try {
        await qrScannerRef.current.start()
        setMessage('QR scanner active. Point camera at QR code.')
      } catch (startError) {
        if (startError.name === 'NotFoundError' || startError.name === 'OverconstrainedError') {
          qrScannerRef.current.destroy()
          
          qrScannerRef.current = new QrScanner(
            videoRef.current,
            result => {
              parseQRData(result.data)
              stopScanning()
            },
            {
              onDecodeError: () => {
              },
              preferredCamera: 'user',
              highlightScanRegion: true,
              highlightCodeOutline: true,
              maxScansPerSecond: 5,
            }
          )
          
          await qrScannerRef.current.start()
          setMessage('Scanning')
        } else {
          throw startError
        }
      }
      
    } catch (error) {
      console.error('Error starting QR scanner:', error)
      let errorMessage = 'Error starting QR scanner: '
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Camera permission denied. Please allow camera access and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please check your camera connection.'
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported in this browser. Try Chrome, Firefox, or Safari.'
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is already in use by another application.'
      } else {
        errorMessage += error.message
      }
      
      setMessage(errorMessage + ' - Use manual input.')
      setIsScanning(false)
      
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy()
        qrScannerRef.current = null
      }
    }
  }

  const stopScanning = () => {
    setIsScanning(false)
    
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop()
        qrScannerRef.current.destroy()
      } catch (error) {
        console.error('Error stopping QR scanner:', error)
      }
      qrScannerRef.current = null
    }
    
    setMessage('')
  }

  const handleManualInput = () => {
    if (manualInput.trim()) {
      parseQRData(manualInput.trim())
      setManualInput('')
    }
  }

  const parseQRData = (qrText) => {
    try {
      const lines = qrText.split('\n').filter(line => line.trim() !== '')
      
      if (lines.length < 22 || lines[0] !== 'GACMP') {
        throw new Error('Invalid QR code format')
      }

      const data = {
        'Scouting ID': `${lines[0]}_${lines[1]}_${lines[2]}`,
        'Scouter Name': lines[3],
        'Position': lines[4],
        'Auto Path': lines[5] === 'null' ? null : lines[5],
        'L4 Count': parseInt(lines[6]),
        'L4 Missed Count': parseInt(lines[7]),
        'L3 Count': parseInt(lines[8]),
        'L3 Missed Count': parseInt(lines[9]),
        'L2 Count': parseInt(lines[10]),
        'L2 Missed Count': parseInt(lines[11]),
        'L1 Count': parseInt(lines[12]),
        'L1 Missed Count': parseInt(lines[13]),
        'Processor Count': parseInt(lines[14]),
        'Processor Missed Count': parseInt(lines[15]),
        'Net Count': parseInt(lines[16]),
        'Net Missed Count': parseInt(lines[17]),
        'Endgame Position': lines[18],
        'Is Ground Coral?': lines[19] === 'true',
        'Is Ground Algae?': lines[20] === 'true',
        'Driver Quality': 0,
        'Mechanical Reliability': lines[21] === 'true' ? 0 : 5,
        'Defense Ability': parseInt(lines[22]),
        'Algae Descorability': 0,
        'Notes': lines[23],
        'Use Data': true,
        _teamNumber: parseInt(lines[1]),
        _matchNumber: parseInt(lines[2])
      }

      setParsedData(data)
      setMessage('QR code parsed successfully!')
    } catch (error) {
      console.error('Error parsing QR data:', error)
      setMessage('Error parsing QR code: ' + error.message)
      setParsedData(null)
    }
  }

  const uploadToUnconfirmed = async () => {
    if (!parsedData) {
      setMessage('No data to upload - please scan or parse QR code first')
      toast.message('Nothing to upload', { description: 'Scan a QR code or paste data first.' })
      return
    }

    try {
      const { _teamNumber, _matchNumber, ...dataToInsert } = parsedData

      const result = await insertUnconfirmedData(dataToInsert)
      if (result?.error) throw result.error

      setMessage(result.queued ? 'Saved offline! Will sync when online.' : 'Data uploaded successfully to unconfirmed_data!')
      if (result.queued) {
        toast.message('Saved offline', { description: 'Will sync when online.' })
      } else {
        toast.success('Uploaded', { description: 'Added to unconfirmed data.' })
      }
      setParsedData(null)
      
      if (isAuthenticated) {
        if (result.queued) {
          setUnconfirmedData(prev => [dataToInsert, ...(prev || [])])
        } else {
          fetchUnconfirmedData()
        }
      }
    } catch (error) {
      console.error('Error uploading data:', error)
      setMessage('Error uploading data: ' + error.message)
      toast.error('Upload failed', { description: error.message })
    }
  }

  const approveData = async (unconfirmedItem) => {
    try {
      const result = await approveUnconfirmedData(unconfirmedItem)
      if (result?.error) throw result.error

      setMessage(
        result.queued
          ? `Approval queued for ${unconfirmedItem['Scouting ID']} (will sync when online)`
          : `Approved data for ${unconfirmedItem['Scouting ID']}`,
      )
      if (result.queued) {
        toast.message('Approval queued', { description: unconfirmedItem['Scouting ID'] })
      } else {
        toast.success('Approved', { description: unconfirmedItem['Scouting ID'] })
      }

      if (result.queued) {
        setUnconfirmedData(prev =>
          (prev || []).filter(row => row['Scouting ID'] !== unconfirmedItem['Scouting ID']),
        )
      } else {
        fetchUnconfirmedData()
      }
    } catch (error) {
      console.error('Error approving data:', error)
      setMessage('Error approving data: ' + error.message)
      toast.error('Approve failed', { description: error.message })
    }
  }

  const rejectData = async (unconfirmedItem) => {
    try {
      const result = await rejectUnconfirmedData(unconfirmedItem['Scouting ID'])
      if (result?.error) throw result.error

      setMessage(
        result.queued
          ? `Rejection queued for ${unconfirmedItem['Scouting ID']} (will sync when online)`
          : `Rejected data for ${unconfirmedItem['Scouting ID']}`,
      )
      if (result.queued) {
        toast.message('Rejection queued', { description: unconfirmedItem['Scouting ID'] })
      } else {
        toast.success('Rejected', { description: unconfirmedItem['Scouting ID'] })
      }

      if (result.queued) {
        setUnconfirmedData(prev =>
          (prev || []).filter(row => row['Scouting ID'] !== unconfirmedItem['Scouting ID']),
        )
      } else {
        fetchUnconfirmedData()
      }
    } catch (error) {
      console.error('Error rejecting data:', error)
      setMessage('Error rejecting data: ' + error.message)
      toast.error('Reject failed', { description: error.message })
    }
  }

  return (
    <div className="upload-container">
      <h2>Upload</h2>
      
      {/* QR Scanner Section */}
      <div className="upload-section">
        <h3>QR Code Scanner</h3>
        
        {/* Camera Scanner */}
        <div className="camera-section">
          <div className="camera-button-wrapper">
            <button 
              onClick={isScanning ? stopScanning : startScanning}
              className={`camera-button ${isScanning ? 'stop' : 'start'}`}
            >
              {isScanning ? 'Stop Camera' : 'Start Camera'}
            </button>
          </div>

          {isScanning && (
            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
              />
            </div>
          )}
        </div>

        {/* Manual Input */}
        <div className="manual-input-section">
          <h4>Manual QR Data Input</h4>
          <textarea
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="manual-input-textarea"
          />
          <button 
            onClick={handleManualInput}
            disabled={!manualInput.trim()}
            className={`parse-button ${manualInput.trim() ? 'enabled' : 'disabled'}`}
          >
            Parse QR Data
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {parsedData && (
          <div className="parsed-data-container">
            <h4>Parsed QR Data:</h4>
            <p><strong>Team:</strong> {parsedData._teamNumber}</p>
            <p><strong>Match:</strong> {parsedData._matchNumber}</p>
            <p><strong>Scouter:</strong> {parsedData['Scouter Name']}</p>
            <p><strong>Position:</strong> {parsedData['Position']}</p>
            <p><strong>Scouting ID:</strong> {parsedData['Scouting ID']}</p>
            
            <button 
              onClick={uploadToUnconfirmed}
              className="upload-button"
            >
              Upload
            </button>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <div>
          <h3>Unconfirmed Data Management</h3>
          <p>Review and approve scanned data below:</p>
          
          {unconfirmedData.length === 0 ? (
            <p>No unconfirmed data found.</p>
          ) : (
            <div className="unconfirmed-data-container">
              {unconfirmedData.map((item) => (
                <div 
                  key={item['Scouting ID']} 
                  className="unconfirmed-item"
                >
                  <h4>{item['Scouting ID']}</h4>
                  <p><strong>Team:</strong> {item['Scouting ID']?.split('_')[1]} | <strong>Match:</strong> {item['Scouting ID']?.split('_')[2]}</p>
                  <p><strong>Scouter:</strong> {item['Scouter Name']} | <strong>Position:</strong> {item['Position']}</p>
                  <p><strong>Notes:</strong> {item['Notes']}</p>
                  
                  <div className="unconfirmed-item-actions">
                    <button 
                      onClick={() => approveData(item)}
                      className="approve-button"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => rejectData(item)}
                      className="reject-button"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Upload
