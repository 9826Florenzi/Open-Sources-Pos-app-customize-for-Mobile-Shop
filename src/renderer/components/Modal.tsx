import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  show: boolean
  onClose: () => void
  title: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: React.ReactNode
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ show, onClose, title, size = 'md', footer, children }) => {
  if (!show) return null
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal modal-${size}`}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// Confirm dialog helper
interface ConfirmProps {
  show: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export const ConfirmDialog: React.FC<ConfirmProps> = ({ show, title, message, onConfirm, onCancel, danger }) => (
  <Modal show={show} onClose={onCancel} title={title} size="sm"
    footer={
      <>
        <button className="btn btn-outline" onClick={onCancel}>Hủy</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Xác nhận</button>
      </>
    }
  >
    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{message}</p>
  </Modal>
)
