import { formatCurrency } from '../utils/format'
import React, { useState, useEffect } from 'react'
// @ts-ignore
import JsBarcode from 'jsbarcode'
import { Modal } from './Modal'
import { useNotify } from '../context/AppContext'
import { Printer, Sliders, CheckCircle2, AlertCircle, MoveHorizontal } from 'lucide-react'

interface BarcodeModalProps {
  show: boolean
  onClose: () => void
  product: any
  storeName?: string
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  show,
  onClose,
  product,
  storeName = 'Đại Nguyễn Mobile'
}) => {
  const notify = useNotify()
  const [currentStoreName, setCurrentStoreName] = useState<string>(storeName)
  const [barcodeCount, setBarcodeCount] = useState<number>(2)
  const [barcodePreset, setBarcodePreset] = useState<'double_72x22' | 'double_74x22' | 'single_40x30'>('double_72x22')
  const [showStore, setShowStore] = useState<boolean>(true)
  const [showName, setShowName] = useState<boolean>(true)
  const [showPrice, setShowPrice] = useState<boolean>(true)
  const [barcodeValue, setBarcodeValue] = useState<string>('')
  const [barcodeImgDataUrl, setBarcodeImgDataUrl] = useState<string>('')

  // Độ dịch tem hàng bên trái (mm) - mặc định 0mm (giữ nguyên)
  const [leftColOffset, setLeftColOffset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('barcode_left_offset')
      return saved !== null && !isNaN(Number(saved)) ? Number(saved) : 0
    } catch {
      return 0
    }
  })

  // Độ dịch tem hàng bên phải (mm) - mốc 0 default (thực tế -3mm làm chuẩn)
  const [rightColOffset, setRightColOffset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('barcode_right_offset')
      return saved !== null && !isNaN(Number(saved)) ? Number(saved) : 0
    } catch {
      return 0
    }
  })

  function updateLeftOffset(val: number) {
    setLeftColOffset(val)
    try { localStorage.setItem('barcode_left_offset', String(val)) } catch {}
  }

  function updateRightOffset(val: number) {
    setRightColOffset(val)
    try { localStorage.setItem('barcode_right_offset', String(val)) } catch {}
  }

  // Load store name from settings on open
  useEffect(() => {
    if (show) {
      window.api?.settings?.get('store.name').then((val: any) => {
        if (val) setCurrentStoreName(val)
      }).catch(() => {})
    }
  }, [show])

  // Generate crisp barcode image whenever product or show changes
  useEffect(() => {
    if (show && product) {
      const code = product.barcode || product.sku || (product.id ? `SP${String(product.id).padStart(6, '0')}` : '12345678')
      setBarcodeValue(code)
      generateCrispBarcode(code)
    } else if (!show) {
      setBarcodeValue('')
      setBarcodeImgDataUrl('')
    }
  }, [show, product])

  function generateCrispBarcode(code: string) {
    try {
      const canvas = document.createElement('canvas')
      // Width = 2.0 (thu nhỏ 10% từ 2.2), Height = 46 (thu nhỏ 10% từ 52) cho nét chuẩn tâm
      JsBarcode(canvas, code, {
        format: 'CODE128',
        lineColor: '#000000',
        width: 2.0,
        height: 46,
        displayValue: false, // We render crisp HTML text below
        margin: 0,
        background: '#ffffff'
      })
      setBarcodeImgDataUrl(canvas.toDataURL('image/png'))
    } catch (e) {
      console.error('Failed to generate barcode:', e)
    }
  }

  
  function handlePrintBarcode() {
    if (!product) return
    const priceStr = formatCurrency(product.sell_price || 0)
    const code = barcodeValue || product.barcode || product.sku || String(product.id || '')

    // Generate fresh canvas data URL for maximum sharpness (thu nhỏ 10% và căn giữa)
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, code, {
      format: 'CODE128',
      lineColor: '#000000',
      width: 2.0,
      height: 46,
      displayValue: false,
      margin: 0,
      background: '#ffffff'
    })
    const imgUrl = canvas.toDataURL('image/png')

    // QUAN TRỌNG: Để màn hình preview của Windows 11 KHÔNG bị trắng tinh,
    // iframe KHÔNG được để visibility: hidden hay width: 0 / height: 0.
    // Phải để kích thước thực (800x600) và đẩy ra ngoài màn hình (left: -9999px, opacity: 0).
    let iframe = document.getElementById('barcode-print-iframe') as HTMLIFrameElement
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'barcode-print-iframe'
      document.body.appendChild(iframe)
    }
    iframe.style.position = 'fixed'
    iframe.style.left = '-9999px'
    iframe.style.top = '0'
    iframe.style.width = '800px'
    iframe.style.height = '600px'
    iframe.style.border = 'none'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'
    iframe.style.zIndex = '-999'

    const isDouble = barcodePreset.startsWith('double')
    const paperWidth = barcodePreset === 'double_74x22' ? '74mm' : barcodePreset === 'double_72x22' ? '72mm' : '40mm'
    const paperHeight = isDouble ? '22mm' : '30mm'
    const gapWidth = barcodePreset === 'double_74x22' ? '4mm' : '2mm'

    let contentHtml = ''

    if (isDouble) {
      // Group into rows of 2 labels (tem đôi)
      const rowCount = Math.ceil(barcodeCount / 2)
      for (let r = 0; r < rowCount; r++) {
        const hasRight = (r * 2 + 1) < barcodeCount
        contentHtml += `
          <div class="label-row-double">
            <!-- Tem trái (áp dụng độ dịch left: ${leftColOffset}mm) -->
            <div class="label-col label-col-left" style="position: relative; left: ${leftColOffset}mm;">
              ${showStore ? `<div class="store-name">${currentStoreName}</div>` : ''}
              ${showName ? `<div class="product-name" title="${product.name}">${product.name}</div>` : ''}
              <div class="barcode-box">
                <img class="barcode-img" src="${imgUrl}" />
                <div class="barcode-text">${code}</div>
              </div>
              ${showPrice ? `<div class="price">${priceStr}</div>` : ''}
            </div>

            <div class="label-gap" style="width: ${gapWidth};"></div>

            <!-- Tem phải (áp dụng độ dịch left: ${-3 + rightColOffset}mm - mốc 0 là -3mm chuẩn) -->
            <div class="label-col label-col-right ${hasRight ? '' : 'placeholder'}" style="position: relative; left: ${-3 + rightColOffset}mm;">
              ${hasRight ? `
                ${showStore ? `<div class="store-name">${currentStoreName}</div>` : ''}
                ${showName ? `<div class="product-name" title="${product.name}">${product.name}</div>` : ''}
                <div class="barcode-box">
                  <img class="barcode-img" src="${imgUrl}" />
                  <div class="barcode-text">${code}</div>
                </div>
                ${showPrice ? `<div class="price">${priceStr}</div>` : ''}
              ` : ''}
            </div>
          </div>
        `
      }
    } else {
      // Tem đơn 40x30mm
      for (let i = 0; i < barcodeCount; i++) {
        contentHtml += `
          <div class="label-row-single">
            ${showStore ? `<div class="store-name-single">${currentStoreName}</div>` : ''}
            ${showName ? `<div class="product-name-single" title="${product.name}">${product.name}</div>` : ''}
            <div class="barcode-box-single">
              <img class="barcode-img-single" src="${imgUrl}" />
              <div class="barcode-text-single">${code}</div>
            </div>
            ${showPrice ? `<div class="price-single">${priceStr}</div>` : ''}
          </div>
        `
      }
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>In Tem Mã Vạch - Đại Nguyễn Mobile</title>
          <style>
            @page {
              size: ${paperWidth} ${paperHeight};
              margin: 0mm !important;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: ${paperWidth};
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              font-family: Arial, Helvetica, sans-serif;
            }

            /* --- TEM ĐÔI (2 tem / hàng - 35x22mm mỗi tem) --- */
            .label-row-double {
              width: ${paperWidth};
              height: ${paperHeight};
              max-height: ${paperHeight};
              min-height: ${paperHeight};
              display: flex;
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              overflow: hidden;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .label-gap {
              height: 22mm;
              flex-shrink: 0;
            }

            .label-col {
              width: 35mm;
              height: 22mm;
              max-height: 22mm;
              min-height: 22mm;
              padding: 0.6mm 0.8mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              text-align: center;
              overflow: hidden;
              box-sizing: border-box;
            }

            .label-col.placeholder {
              visibility: hidden;
            }

            .store-name {
              font-size: 7pt;
              font-weight: 700;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
              height: 2.7mm;
              line-height: 2.7mm;
              color: #000;
            }

            .product-name {
              font-size: 6.5pt;
              font-weight: 600;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
              height: 2.7mm;
              line-height: 2.7mm;
              color: #000;
            }

            .barcode-box {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              width: 100%;
              height: 9.0mm;
              overflow: hidden;
              margin: 0 auto;
            }

            .barcode-img {
              height: 6.5mm;
              max-height: 6.5mm;
              max-width: 29.5mm;
              width: auto;
              margin: 0 auto;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: pixelated;
              image-rendering: crisp-edges;
              display: block;
            }

            .barcode-text {
              font-family: 'Consolas', 'Courier New', monospace;
              font-size: 5.5pt;
              font-weight: 700;
              letter-spacing: 0.5px;
              height: 2.2mm;
              line-height: 2.2mm;
              color: #000;
              text-align: center;
              width: 100%;
              margin: 0 auto;
            }

            .price {
              font-size: 8.5pt;
              font-weight: 800;
              height: 3.4mm;
              line-height: 3.4mm;
              color: #000;
              letter-spacing: -0.2px;
            }

            /* --- TEM ĐƠN (40x30mm) --- */
            .label-row-single {
              width: 40mm;
              height: 30mm;
              max-height: 30mm;
              min-height: 30mm;
              padding: 1.2mm 1.5mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              text-align: center;
              overflow: hidden;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            .store-name-single {
              font-size: 8.5pt;
              font-weight: 700;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
              height: 3.5mm;
              line-height: 3.5mm;
              color: #000;
            }

            .product-name-single {
              font-size: 7.5pt;
              font-weight: 600;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              width: 100%;
              height: 3.5mm;
              line-height: 3.5mm;
              color: #000;
            }

            .barcode-box-single {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              width: 100%;
              height: 11mm;
              overflow: hidden;
              margin: 0 auto;
            }

            .barcode-img-single {
              height: 8mm;
              max-height: 8mm;
              max-width: 32mm;
              width: auto;
              margin: 0 auto;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: pixelated;
              image-rendering: crisp-edges;
              display: block;
            }

            .barcode-text-single {
              font-family: 'Consolas', 'Courier New', monospace;
              font-size: 6.5pt;
              font-weight: 700;
              letter-spacing: 0.6px;
              height: 2.5mm;
              line-height: 2.5mm;
              color: #000;
              text-align: center;
              width: 100%;
              margin: 0 auto;
            }

            .price-single {
              font-size: 10pt;
              font-weight: 800;
              height: 4.5mm;
              line-height: 4.5mm;
              color: #000;
            }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `)
    doc.close()

    // Chờ Chromium layout DOM và render xong hình ảnh trước khi gọi window.print()
    // Đảm bảo Print Preview của Windows 11 hiện đầy đủ nội dung, không bị trắng tinh
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch (err) {
        console.error('Error invoking print:', err)
      }
    }, 250)

    notify.success('Đã gửi lệnh in tem!', 'Vui lòng chọn máy in Xprinter XP-350B trong hộp thoại in.')
  }

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="In tem mã vạch (Barcode - Xprinter XP-350B)"
      size="md"
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Đóng</button>
          <button className="btn btn-primary" onClick={handlePrintBarcode} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Printer size={15} />
            <span>In {barcodeCount} tem</span>
          </button>
        </>
      }
    >
      {product && (
        <div>
          {/* Live Preview of Tem Đôi */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Mô phỏng bản in thực tế (Khổ tem đôi 35x22mm x 2)</span>
              <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>Khớp 100% Xprinter XP-350B</span>
            </div>

            {/* Simulated 2-label row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#e2e8f0',
              padding: '16px 12px',
              borderRadius: 'var(--radius)',
              overflow: 'hidden'
            }}>
              {/* Cột tem trái */}
              <div style={{
                width: 140,
                height: 88,
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: 4,
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                padding: '4px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'center',
                overflow: 'hidden',
                position: 'relative',
                left: `${leftColOffset * 3.5}px`,
                transition: 'left 0.15s ease'
              }}>
                {showStore && (
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#000', textTransform: 'uppercase', width: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {currentStoreName}
                  </div>
                )}
                {showName && (
                  <div style={{ fontSize: 8, fontWeight: 600, color: '#000', width: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {product.name}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', margin: '0 auto' }}>
                  {barcodeImgDataUrl && (
                    <img
                      src={barcodeImgDataUrl}
                      alt="barcode"
                      style={{ height: 25, maxWidth: '85%', margin: '0 auto', imageRendering: 'pixelated' }}
                    />
                  )}
                  <div style={{ fontSize: 7.5, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5, color: '#000', textAlign: 'center', marginTop: 1 }}>
                    {barcodeValue}
                  </div>
                </div>
                {showPrice && (
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#000' }}>
                    {formatCurrency(product.sell_price)}
                  </div>
                )}
              </div>

              {/* Cột tem phải (Mô phỏng độ lệch rightColOffset với mốc 0 là -3mm) */}
              <div style={{
                width: 140,
                height: 88,
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: 4,
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                padding: '4px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'center',
                overflow: 'hidden',
                position: 'relative',
                left: `${(-3 + rightColOffset) * 3.5}px`,
                transition: 'left 0.15s ease'
              }}>
                {showStore && (
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#000', textTransform: 'uppercase', width: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {currentStoreName}
                  </div>
                )}
                {showName && (
                  <div style={{ fontSize: 8, fontWeight: 600, color: '#000', width: '100%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {product.name}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', margin: '0 auto' }}>
                  {barcodeImgDataUrl && (
                    <img
                      src={barcodeImgDataUrl}
                      alt="barcode"
                      style={{ height: 25, maxWidth: '85%', margin: '0 auto', imageRendering: 'pixelated' }}
                    />
                  )}
                  <div style={{ fontSize: 7.5, fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.5, color: '#000', textAlign: 'center', marginTop: 1 }}>
                    {barcodeValue}
                  </div>
                </div>
                {showPrice && (
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#000' }}>
                    {formatCurrency(product.sell_price)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Căn chỉnh vị trí tem trái & tem phải (Offsets) */}
          {barcodePreset.startsWith('double') && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              marginBottom: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  <MoveHorizontal size={16} style={{ color: 'var(--primary)' }} />
                  <span>Căn chỉnh vị trí tem đôi (Máy Xprinter XP-350B):</span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12, color: 'var(--primary)' }}
                  onClick={() => {
                    updateLeftOffset(0)
                    updateRightOffset(0)
                  }}
                >
                  Đặt lại mặc định (0, 0)
                </button>
              </div>

              {/* Tem Trái */}
              <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px dashed #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>1. Tem hàng bên trái (Mặc định 0 mm - giữ nguyên):</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: leftColOffset === 0 ? 'var(--text-secondary)' : leftColOffset < 0 ? '#b91c1c' : '#0284c7',
                    background: 'white',
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1'
                  }}>
                    {leftColOffset === 0 ? 'Giữ nguyên (0 mm)' : leftColOffset < 0 ? `Dịch sang trái ${Math.abs(leftColOffset)} mm` : `Dịch sang phải ${leftColOffset} mm`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.5"
                    value={leftColOffset}
                    onChange={e => updateLeftOffset(parseFloat(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={leftColOffset}
                    onChange={e => updateLeftOffset(parseFloat(e.target.value) || 0)}
                    style={{ width: 65, textAlign: 'center' }}
                    className="form-input"
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => updateLeftOffset(leftColOffset - 0.5)}>-0.5</button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => updateLeftOffset(0)}>0</button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => updateLeftOffset(leftColOffset + 0.5)}>+0.5</button>
                  </div>
                </div>
              </div>

              {/* Tem Phải */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>2. Tem hàng bên phải (Mốc 0 mm mặc định - đã dịch trái 3mm):</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: rightColOffset === 0 ? 'var(--success)' : rightColOffset < 0 ? '#b91c1c' : '#0284c7',
                    background: 'white',
                    padding: '2px 8px',
                    borderRadius: 4,
                    border: '1px solid #cbd5e1'
                  }}>
                    {rightColOffset === 0 ? 'Mốc chuẩn 0 mm (-3mm gốc)' : rightColOffset < 0 ? `Dịch thêm sang trái ${Math.abs(rightColOffset)} mm` : `Dịch sang phải ${rightColOffset} mm`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.5"
                    value={rightColOffset}
                    onChange={e => updateRightOffset(parseFloat(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    value={rightColOffset}
                    onChange={e => updateRightOffset(parseFloat(e.target.value) || 0)}
                    style={{ width: 65, textAlign: 'center' }}
                    className="form-input"
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => updateRightOffset(rightColOffset - 0.5)}>-0.5</button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => updateRightOffset(0)}>0</button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => updateRightOffset(rightColOffset + 0.5)}>+0.5</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form controls */}
          <div className="form-row col-2">
            <div className="form-group">
              <label className="form-label">Tên cửa hàng in trên tem</label>
              <input
                className="form-input"
                value={currentStoreName}
                onChange={e => setCurrentStoreName(e.target.value)}
                placeholder="VD: Đại Nguyễn Mobile"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mã vạch (Barcode / SKU)</label>
              <input
                className="form-input"
                value={barcodeValue}
                onChange={e => {
                  setBarcodeValue(e.target.value)
                  generateCrispBarcode(e.target.value)
                }}
                placeholder="Mã vạch..."
              />
            </div>
          </div>

          <div className="form-row col-2">
            <div className="form-group">
              <label className="form-label">Khổ tem in (Máy XP-350B)</label>
              <select
                className="form-select"
                value={barcodePreset}
                onChange={(e: any) => setBarcodePreset(e.target.value)}
              >
                <option value="double_72x22">Tem đôi 72x22mm (35x22mm x 2) [Chuẩn nhất]</option>
                <option value="double_74x22">Tem đôi 74x22mm (Khoảng cách giữa 4mm)</option>
                <option value="single_40x30">Tem đơn 40x30mm (1 tem / hàng)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Số lượng tem cần in</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  className="form-input"
                  value={barcodeCount}
                  onChange={e => setBarcodeCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="500"
                  style={{ width: 80 }}
                />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setBarcodeCount(2)}>2 tem</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setBarcodeCount(6)}>6 tem</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setBarcodeCount(10)}>10 tem</button>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ background: '#f8fafc', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <label className="form-label" style={{ marginBottom: 6 }}>Nội dung in trên từng con tem:</label>
            <div style={{ display: 'flex', gap: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={showStore} onChange={e => setShowStore(e.target.checked)} />
                <span>Tên cửa hàng</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} />
                <span>Tên sản phẩm</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} />
                <span>Giá bán</span>
              </label>
            </div>
          </div>

          {/* Guide for Xprinter XP-350B */}
          <div style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            lineHeight: 1.5
          }}>
            <b>💡 Mẹo in chuẩn nét cho Xprinter XP-350B trên Windows 11:</b>
            <div style={{ marginTop: 2 }}>
              • Trong hộp thoại in của Windows 11: chọn máy in <b>Xprinter XP-350B</b>.<br />
              • Tại mục <b>Cài đặt khác (More settings)</b>: chọn <b>Lề (Margins): Không (None)</b> hoặc <b>Tối thiểu (Minimum)</b>.<br />
              • Khổ giấy trong Driver: chọn <b>72 x 22 mm</b> (hoặc <b>35x22x2</b>).
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
