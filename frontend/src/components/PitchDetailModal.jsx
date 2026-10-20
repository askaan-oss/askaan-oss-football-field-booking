import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

function PitchDetailModal({ pitchId, isOpen, onClose, onBookPitch }) {
  const [pitch, setPitch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Form gửi đánh giá
  const [reviewForm, setReviewForm] = useState({
    customer_name: '',
    customer_phone: '',
    rating: 5,
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen && pitchId) {
      fetchPitchDetail();
      // Tự động điền tên/sđt nếu khách đã đăng nhập
      const savedCustomer = localStorage.getItem('customer_info');
      if (savedCustomer) {
        try {
          const cust = JSON.parse(savedCustomer);
          setReviewForm(prev => ({
            ...prev,
            customer_name: cust.full_name || '',
            customer_phone: cust.phone || ''
          }));
        } catch (e) {}
      }
    } else {
      setPitch(null);
      setActiveImageIndex(0);
      setReviewMessage({ type: '', text: '' });
    }
  }, [isOpen, pitchId]);

  const fetchPitchDetail = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/pitches/${pitchId}`);
      if (res.data.success) {
        setPitch(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải thông tin sân:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.customer_name.trim()) {
      setReviewMessage({ type: 'error', text: 'Vui lòng nhập họ và tên của bạn.' });
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewMessage({ type: '', text: '' });
      const res = await axiosClient.post(`/pitches/${pitchId}/reviews`, {
        customer_name: reviewForm.customer_name.trim(),
        customer_phone: reviewForm.customer_phone.trim() || null,
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim()
      });

      if (res.data.success) {
        setReviewMessage({ type: 'success', text: 'Cảm ơn bạn đã gửi đánh giá & góp ý!' });
        setReviewForm(prev => ({ ...prev, comment: '' }));
        // Tải lại chi tiết sân để cập nhật đánh giá mới & điểm trung bình
        await fetchPitchDetail();
      }
    } catch (err) {
      setReviewMessage({
        type: 'error',
        text: err.response?.data?.message || 'Không thể gửi đánh giá, vui lòng thử lại sau.'
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!isOpen) return null;

  // Tổng hợp ảnh đại diện và ảnh gallery
  const allImages = [];
  if (pitch?.avatar_url) {
    allImages.push({
      id: 'main',
      image_url: pitch.avatar_url,
      caption: 'Ảnh đại diện chính của sân'
    });
  }
  if (pitch?.images && pitch.images.length > 0) {
    pitch.images.forEach(img => {
      allImages.push({
        id: img.id,
        image_url: img.image_url,
        caption: img.caption || 'Ảnh góc sân'
      });
    });
  }

  const currentImage = allImages[activeImageIndex] || allImages[0];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '920px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#064e3b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚽ {pitch?.name || 'Chi Tiết Sân Bóng'}
              {pitch && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#10b981',
                    color: '#ffffff'
                  }}
                >
                  {pitch.type}
                </span>
              )}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#059669' }}>
              Thông tin chi tiết, góc chụp thực tế và đánh giá từ cộng đồng
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: '#64748b',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
            title="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        {/* NỘI DUNG CUỘN */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#059669' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
              <p style={{ fontWeight: 'bold' }}>Đang tải thông tin chi tiết sân bóng...</p>
            </div>
          ) : !pitch ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444' }}>
              <p>Không tìm thấy thông tin sân bóng.</p>
            </div>
          ) : (
            <div>
              {/* PHẦN 1: THƯ VIỆN ẢNH & THÔNG TIN CƠ BẢN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '24px', marginBottom: '28px' }}>
                {/* CỘT TRÁI: GALLERY ẢNH */}
                <div>
                  {currentImage ? (
                    <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', background: '#0f172a', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={currentImage.image_url}
                        alt={currentImage.caption}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                          padding: '24px 14px 10px 14px',
                          color: '#ffffff',
                          fontSize: '13px'
                        }}
                      >
                        📷 {currentImage.caption}
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '280px', background: '#f1f5f9', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      Chưa có hình ảnh mô tả
                    </div>
                  )}

                  {/* DANH SÁCH ẢNH THU NHỎ */}
                  {allImages.length > 1 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                      {allImages.map((img, idx) => (
                        <div
                          key={img.id}
                          onClick={() => setActiveImageIndex(idx)}
                          style={{
                            width: '64px',
                            height: '52px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            cursor: 'pointer',
                            border: activeImageIndex === idx ? '2px solid #059669' : '1px solid #cbd5e1',
                            opacity: activeImageIndex === idx ? 1 : 0.65,
                            transition: 'all 0.2s'
                          }}
                        >
                          <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* CỘT PHẢI: THÔNG SỐ VÀ ĐIỂM ĐÁNH GIÁ */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '26px', fontWeight: '800', color: '#059669' }}>
                        {Number(pitch.price_default).toLocaleString('vi-VN')} đ
                      </span>
                      <span style={{ color: '#64748b', fontSize: '14px' }}>/ ca chuẩn</span>
                    </div>

                    {/* HỘP ĐIỂM SAO TRUNG BÌNH */}
                    <div
                      style={{
                        background: '#fefce8',
                        border: '1px solid #fef08a',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px'
                      }}
                    >
                      <div style={{ fontSize: '36px', fontWeight: '900', color: '#b45309', lineHeight: 1 }}>
                        {pitch.rating_stats?.average_rating || 5.0}
                      </div>
                      <div>
                        <div style={{ color: '#f59e0b', fontSize: '18px', letterSpacing: '2px' }}>
                          {'★'.repeat(Math.round(pitch.rating_stats?.average_rating || 5))}
                          {'☆'.repeat(5 - Math.round(pitch.rating_stats?.average_rating || 5))}
                        </div>
                        <div style={{ fontSize: '13px', color: '#78350f', marginTop: '2px' }}>
                          Dựa trên <b>{pitch.rating_stats?.total_reviews || 0}</b> lượt đánh giá từ khách hàng
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.8 }}>
                      <div><b>Loại sân:</b> {pitch.type} tiêu chuẩn chất lượng cao</div>
                      <div><b>Trạng thái:</b> {pitch.status === 'active' ? '🟢 Sẵn sàng phục vụ' : '🛠️ Đang bảo trì mặt cỏ'}</div>
                      <div><b>Tiện ích:</b> Đèn LED ban đêm, lưới bao quanh, vạch kẻ thi đấu rõ nét, thoát nước tốt.</div>
                    </div>
                  </div>

                  {pitch.status === 'active' && onBookPitch && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onBookPitch(pitch.id);
                      }}
                      className="btn-action-primary"
                      style={{
                        width: '100%',
                        padding: '14px',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        marginTop: '16px',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      ⚽ Đặt Sân Này Ngay
                    </button>
                  )}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />

              {/* PHẦN 2: ĐÁNH GIÁ & GÓP Ý */}
              <div>
                <h3 style={{ fontSize: '17px', color: '#064e3b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💬 Đánh Giá & Góp Ý Từ Khách Hàng ({pitch.reviews?.length || 0})
                </h3>

                {/* FORM GỬI ĐÁNH GIÁ MỚI */}
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '18px',
                    marginBottom: '24px'
                  }}
                >
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#1e293b' }}>
                    ✍️ Gửi nhận xét & đánh giá của bạn cho sân này:
                  </h4>

                  {reviewMessage.text && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '14px',
                        fontSize: '13px',
                        background: reviewMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: reviewMessage.type === 'success' ? '#065f46' : '#991b1b',
                        border: `1px solid ${reviewMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                      }}
                    >
                      {reviewMessage.text}
                    </div>
                  )}

                  <form onSubmit={handleSubmitReview}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                          Họ và tên của bạn: *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: Nguyễn Văn An"
                          value={reviewForm.customer_name}
                          onChange={(e) => setReviewForm({ ...reviewForm, customer_name: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                          Số điện thoại (để xác thực):
                        </label>
                        <input
                          type="text"
                          placeholder="Ví dụ: 0912345678"
                          value={reviewForm.customer_phone}
                          onChange={(e) => setReviewForm({ ...reviewForm, customer_phone: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                          Số sao đánh giá:
                        </label>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '36px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                fontSize: '22px',
                                cursor: 'pointer',
                                color: star <= reviewForm.rating ? '#f59e0b' : '#cbd5e1',
                                padding: '0 2px'
                              }}
                              title={`${star} sao`}
                            >
                              ★
                            </button>
                          ))}
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#b45309', marginLeft: '6px' }}>
                            ({reviewForm.rating} sao)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', marginBottom: '4px' }}>
                        Nội dung nhận xét & góp ý chất lượng sân:
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Chia sẻ cảm nhận về độ nảy của bóng, mặt cỏ, hệ thống ánh sáng, không khí tại sân..."
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        disabled={submittingReview}
                        style={{
                          background: '#059669',
                          color: '#ffffff',
                          padding: '9px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          cursor: submittingReview ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {submittingReview ? 'Đang gửi...' : '🚀 Gửi Đánh Giá Ngay'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* DANH SÁCH REVIEW HIỆN CÓ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pitch.reviews && pitch.reviews.length > 0 ? (
                    pitch.reviews.map((rev) => (
                      <div
                        key={rev.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#ecfdf5',
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '13px'
                              }}
                            >
                              {rev.customer_name?.charAt(0)?.toUpperCase() || 'K'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
                                {rev.customer_name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                {rev.created_at_formatted || 'Gần đây'}
                              </div>
                            </div>
                          </div>

                          <div style={{ color: '#f59e0b', fontSize: '15px', letterSpacing: '1px' }}>
                            {'★'.repeat(rev.rating)}
                            {'☆'.repeat(5 - rev.rating)}
                          </div>
                        </div>

                        <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                          {rev.comment || 'Khách hàng không để lại bình luận.'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontStyle: 'italic', background: '#f8fafc', borderRadius: '10px' }}>
                      Chưa có đánh giá nào cho sân này. Hãy là người đầu tiên gửi nhận xét nhé!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PitchDetailModal;

