import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy bỏ',
    type: 'primary', // 'primary' | 'danger' | 'warning' | 'success' | 'info'
    isAlertOnly: false,
  });

  const resolverRef = useRef(null);

  const confirm = useCallback(
    ({
      title = 'Xác nhận thao tác',
      message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
      confirmText = 'Đồng ý',
      cancelText = 'Hủy bỏ',
      type = 'primary',
    } = {}) => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setModalState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText,
          type,
          isAlertOnly: false,
        });
      });
    },
    []
  );

  const showAlert = useCallback(
    ({
      title = 'Thông báo',
      message = '',
      confirmText = 'Đã hiểu',
      type = 'info',
    } = {}) => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setModalState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText: '',
          type,
          isAlertOnly: true,
        });
      });
    },
    []
  );

  const handleConfirm = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  // Color schemes based on type
  const getTypeStyles = (type) => {
    switch (type) {
      case 'danger':
        return {
          icon: '⚠️',
          iconBg: 'rgba(239, 68, 68, 0.15)',
          iconColor: '#ef4444',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          confirmBtnBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
          glow: 'rgba(239, 68, 68, 0.25)',
        };
      case 'warning':
        return {
          icon: '⚡',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          iconColor: '#f59e0b',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          confirmBtnBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
          glow: 'rgba(245, 158, 11, 0.25)',
        };
      case 'success':
        return {
          icon: '✓',
          iconBg: 'rgba(34, 197, 94, 0.15)',
          iconColor: '#22c55e',
          borderColor: 'rgba(34, 197, 94, 0.3)',
          confirmBtnBg: 'linear-gradient(135deg, #22c55e, #16a34a)',
          glow: 'rgba(34, 197, 94, 0.25)',
        };
      case 'info':
        return {
          icon: 'ℹ️',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          iconColor: '#3b82f6',
          borderColor: 'rgba(59, 130, 246, 0.3)',
          confirmBtnBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          glow: 'rgba(59, 130, 246, 0.25)',
        };
      default:
        return {
          icon: '❓',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          iconColor: '#10b981',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          confirmBtnBg: 'linear-gradient(135deg, #10b981, #059669)',
          glow: 'rgba(16, 185, 129, 0.25)',
        };
    }
  };

  const currentTheme = getTypeStyles(modalState.type);

  return (
    <ConfirmContext.Provider value={{ confirm, showAlert }}>
      {children}
      {modalState.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(7, 13, 24, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={handleCancel}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#111827',
              border: `1px solid ${currentTheme.borderColor}`,
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 24px ${currentTheme.glow}`,
              padding: '24px',
              color: '#f9fafb',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Header with Icon & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: currentTheme.iconBg,
                  color: currentTheme.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                {currentTheme.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.15rem',
                    fontWeight: '700',
                    color: '#f3f4f6',
                    lineHeight: '1.4',
                  }}
                >
                  {modalState.title}
                </h3>
              </div>
            </div>

            {/* Message Body */}
            <div
              style={{
                fontSize: '0.95rem',
                color: '#9ca3af',
                lineHeight: '1.6',
                whiteSpace: 'pre-line',
                paddingLeft: '2px',
              }}
            >
              {modalState.message}
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                marginTop: '8px',
              }}
            >
              {!modalState.isAlertOnly && (
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #374151',
                    backgroundColor: 'rgba(31, 41, 55, 0.7)',
                    color: '#d1d5db',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#374151';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(31, 41, 55, 0.7)';
                    e.currentTarget.style.color = '#d1d5db';
                  }}
                >
                  {modalState.cancelText}
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={handleConfirm}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: currentTheme.confirmBtnBg,
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: `0 4px 12px ${currentTheme.glow}`,
                  transition: 'transform 0.15s ease, filter 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}

