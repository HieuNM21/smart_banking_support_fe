/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { Form, Input, Button, Tabs, Card, Modal, Result, Steps, Typography, message, Layout } from 'antd'; // Import thêm Layout nếu muốn dùng Footer
import { SearchOutlined, SendOutlined, BankOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';

const { Title, Text } = Typography;
const { Footer } = Layout;

const CustomerPortal = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [form] = Form.useForm();

  // --- LOGIC XỬ LÝ GIỮ NGUYÊN NHƯ CŨ ---
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const res = await axiosClient.post('/api/public/tickets', values); // Lưu ý check lại đường dẫn API
      Modal.success({
        title: 'Gửi yêu cầu thành công!',
        content: (
          <div>
            <p>Vui lòng lưu lại mã tra cứu của bạn:</p>
            <Title level={3} copyable>{res.ticketCode}</Title>
          </div>
        ),
      });
      form.resetFields();
    } catch (err) {
      message.error('Không thể gửi yêu cầu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (code) => {
    if (!code) return;
    setLoading(true);
    try {
      const res = await axiosClient.get(`/api/public/tickets/${code}`);
      setSearchResult(res);
    } catch (err) {
      message.error('Mã Ticket không tồn tại!');
      setSearchResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (status) => {
    const map = { 'OPEN': 0, 'PROCESSING': 1, 'DONE': 2 };
    return map[status] || 0;
  };

  // --- PHẦN GIAO DIỆN ĐƯỢC SỬA LẠI ---
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f2f5', // Màu nền xám nhẹ chuẩn Enterprise
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', // Căn giữa chiều dọc
      alignItems: 'center',     // Căn giữa chiều ngang
      padding: 20
    }}>
      
      {/* Header Logo đơn giản */}
      <div style={{ marginBottom: 30, textAlign: 'center' }}>
        <BankOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        <Title level={2} style={{ margin: '10px 0 0', color: '#001529' }}>SBSC Support Center</Title>
        <Text type="secondary">Hệ thống hỗ trợ khách hàng tự động 24/7</Text>
      </div>

      {/* Card chính - Đã fix lỗi maxWidth */}
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 800, // Giới hạn chiều rộng
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', // Thêm đổ bóng cho đẹp
          borderRadius: 8
        }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} centered items={[
          {
            key: 'create',
            label: 'Gửi yêu cầu mới',
            children: (
              <Form form={form} layout="vertical" onFinish={handleSubmit} size="large" style={{ marginTop: 20 }}>
                <Form.Item name="guestName" label="Họ tên quý khách" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                    <Input placeholder="Nguyễn Văn A" />
                </Form.Item>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Form.Item name="guestEmail" label="Email liên hệ" rules={[{ required: true, type: 'email', message: 'Email không hợp lệ' }]}>
                      <Input placeholder="example@mail.com" />
                  </Form.Item>
                  <Form.Item name="guestPhone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}>
                      <Input placeholder="0912xxx..." />
                  </Form.Item>
                </div>

                <Form.Item name="subject" label="Vấn đề cần hỗ trợ" rules={[{ required: true, message: 'Vui lòng nhập chủ đề' }]}>
                    <Input placeholder="VD: Báo cáo giao dịch lỗi..." />
                </Form.Item>
                
                <Form.Item name="description" label="Chi tiết nội dung" rules={[{ required: true, message: 'Vui lòng mô tả chi tiết' }]}>
                    <Input.TextArea rows={5} placeholder="Mô tả chi tiết vấn đề của bạn..." spellCheck={false} />
                </Form.Item>

                <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={loading} block size="large" style={{ height: 50, fontSize: 16 }}>
                    Gửi yêu cầu hỗ trợ
                </Button>
              </Form>
            )
          },
          {
            key: 'track',
            label: 'Tra cứu trạng thái',
            children: (
              <div style={{ padding: '20px 0', minHeight: 300 }}>
                <Input.Search 
                  placeholder="Nhập mã Ticket (VD: SBSC-XXXX)" 
                  enterButton={<SearchOutlined />} 
                  onSearch={handleSearch}
                  loading={loading}
                  size="large"
                  style={{ marginBottom: 40 }}
                />
                
                {searchResult ? (
                  <div className="fade-in">
                    <Steps
                      current={getStepStatus(searchResult.status)}
                      items={[
                        { title: 'Đã tiếp nhận', description: 'Hệ thống đã ghi nhận' }, 
                        { title: 'Đang xử lý', description: 'Nhân viên đang kiểm tra' }, 
                        { title: 'Hoàn thành', description: 'Đã có kết quả xử lý' }
                      ]}
                    />
                    
                    <Card type="inner" title="Chi tiết phản hồi" style={{ marginTop: 30, background: '#f9f9f9' }}>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                           <Text><strong>Mã Ticket:</strong> {searchResult.ticketCode}</Text>
                           <Text><strong>Trạng thái:</strong> <span style={{ color: '#1890ff' }}>{searchResult.status}</span></Text>
                           <Text><strong>Độ ưu tiên:</strong> {searchResult.priority}</Text>
                           <Text><strong>Ngày tạo:</strong> {new Date(searchResult.createdAt).toLocaleString('vi-VN')}</Text>
                       </div>
                       
                       {searchResult.aiAnalysis && (
                        <div style={{ background: '#e6f7ff', padding: 15, borderRadius: 6, border: '1px solid #91d5ff' }}>
                          <Text strong style={{ color: '#0050b3' }}><BankOutlined /> AI Support Summary:</Text>
                          <p style={{ marginTop: 5, marginBottom: 0 }}>{searchResult.aiAnalysis.summary || 'Đang cập nhật...'}</p>
                        </div>
                      )}
                    </Card>
                  </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#bfbfbf', marginTop: 50 }}>
                        <SearchOutlined style={{ fontSize: 40, marginBottom: 10 }} />
                        <p>Nhập mã Ticket để xem tiến độ xử lý</p>
                    </div>
                )}
              </div>
            )
          }
        ]} />
      </Card>
      
      <Footer style={{ textAlign: 'center', background: 'transparent' }}>
        SBSC System ©2026 Created by HieuNM21
      </Footer>
    </div>
  );
};

export default CustomerPortal;