/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Layout, List, Avatar, Tag, Typography, Input, Button, 
  Badge, Card, Divider, Tooltip, Empty, Spin, notification, Tabs 
} from 'antd';
import { 
  UserOutlined, SendOutlined, CheckCircleOutlined, 
  ClockCircleOutlined, RobotOutlined, ExclamationCircleOutlined 
} from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import { createStompClient } from '../services/websocketService';

const { Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const AgentDashboard = () => {
  // --- STATE ---
  const [tickets, setTickets] = useState([]); // Danh sách bên trái
  const [selectedTicketId, setSelectedTicketId] = useState(null); // ID ticket đang chọn
  const [ticketDetail, setTicketDetail] = useState(null); // Chi tiết ticket bên phải
  const [comments, setComments] = useState([]); // Lịch sử chat
  const [replyContent, setReplyContent] = useState(''); // Nội dung đang gõ
  
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connected, setConnected] = useState(false);
  
  const stompClient = useRef(null);
  const scrollRef = useRef(null); // Để auto scroll xuống cuối đoạn chat

  // --- 1. FETCH DATA ---

  // Lấy danh sách ticket (Cột trái)
  const fetchTickets = async () => {
    try {
      setLoadingList(true);
      // Gọi API Public tạm thời (Sau này nên đổi thành /api/agent/tickets/my-tickets)
      const res = await axiosClient.get('/api/public/tickets');
      setTickets(res);
    } catch (error) {
      console.error("Lỗi tải danh sách:", error);
    } finally {
      setLoadingList(false);
    }
  };

  // Lấy chi tiết & lịch sử chat (Cột phải)
  const fetchTicketDetail = async (id) => {
    try {
      setLoadingDetail(true);
      const [detailRes, commentsRes] = await Promise.all([
        axiosClient.get(`/api/agent/tickets/${id}`),
        axiosClient.get(`/api/agent/tickets/${id}/comments`)
      ]);
      setTicketDetail(detailRes);
      setComments(commentsRes);
    } catch (error) {
      notification.error({ message: 'Không thể tải chi tiết ticket' });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Khi chọn ticket khác -> Load chi tiết
  useEffect(() => {
    if (selectedTicketId) {
      fetchTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId]);

  // Auto scroll xuống cuối khung chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments, ticketDetail]);

  // --- 2. WEBSOCKET ---
  const playAlertSound = useCallback(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  }, []);

  useEffect(() => {
    stompClient.current = createStompClient(
      () => setConnected(true),
      (data) => {
        // Khi có update
        fetchTickets(); // Refresh list bên trái
        
        // Nếu đang mở đúng ticket đó -> Refresh detail bên phải luôn
        if (selectedTicketId === data.ticketId) {
            fetchTicketDetail(data.ticketId);
        }
      },
      (alert) => {
        playAlertSound();
        notification.error({
            message: 'CẢNH BÁO RỦI RO',
            description: `Ticket ${alert.ticketCode}: ${alert.summary}`,
            duration: 0
        });
      }
    );
    stompClient.current.activate();
    return () => stompClient.current?.deactivate();
  }, [selectedTicketId, playAlertSound]);

  // --- 3. ACTIONS ---

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    try {
      await axiosClient.post(`/api/agent/tickets/${selectedTicketId}/reply`, {
        content: replyContent,
        status: 'IN_PROGRESS', // Mặc định chuyển sang đang xử lý khi reply
        isInternal: false
      });
      
      setReplyContent('');
      fetchTicketDetail(selectedTicketId); // Reload comment
      notification.success({ message: 'Đã gửi phản hồi' });
    } catch (error) {
      notification.error({ message: 'Gửi lỗi', description: error.response?.data?.message || 'Lỗi server' });
    } finally {
      setSubmitting(false);
    }
  };

  // --- HELPER RENDER ---
  
  const getPriorityColor = (p) => {
    if (p === 'CRITICAL') return 'red';
    if (p === 'HIGH') return 'orange';
    return 'blue';
  };

  const renderMessage = (msg) => {
    // Xác định tin nhắn của ai?
    // Logic: Nếu msg.user.role === 'CUSTOMER' (hoặc null user do khách vãng lai) -> Bên Trái
    // Nếu msg.user.role === 'AGENT' -> Bên Phải
    
    // Tạm thời logic đơn giản: Check user ID hoặc Role
    const isAgent = msg.user && (msg.user.role?.name === 'INTERNAL_AGENT' || msg.user.role?.name === 'ADMIN');
    
    return (
      <div key={msg.id} style={{ 
        display: 'flex', 
        justifyContent: isAgent ? 'flex-end' : 'flex-start',
        marginBottom: 15 
      }}>
        {!isAgent && <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />}
        
        <div style={{ maxWidth: '70%' }}>
            <div style={{ 
                padding: '10px 15px', 
                borderRadius: '12px',
                background: isAgent ? '#1890ff' : '#f0f0f0',
                color: isAgent ? 'white' : 'black',
                borderBottomRightRadius: isAgent ? 0 : 12,
                borderTopLeftRadius: !isAgent ? 0 : 12
            }}>
                {msg.content}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: 4, textAlign: isAgent ? 'right' : 'left' }}>
                {new Date(msg.createdAt).toLocaleString('vi-VN')} • {msg.user ? msg.user.fullName : 'Khách hàng'}
            </div>
        </div>

        {isAgent && <Avatar style={{ backgroundColor: '#87d068', marginLeft: 8 }} icon={<UserOutlined />} />}
      </div>
    );
  };

  // --- UI CHÍNH ---
  return (
    <Layout style={{ height: '100vh', background: 'white' }}>
      {/* CỘT TRÁI: DANH SÁCH TICKET */}
      <Sider width={350} theme="light" style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Inbox</Title>
                <Badge status={connected ? "success" : "default"} text={connected ? "Online" : "Offline"} />
            </div>
            <Input.Search placeholder="Tìm kiếm ticket..." style={{ marginTop: 12 }} />
        </div>
        
        <List
            loading={loadingList}
            dataSource={tickets}
            renderItem={item => (
                <List.Item 
                    className={`ticket-item ${selectedTicketId === item.id ? 'active' : ''}`}
                    onClick={() => setSelectedTicketId(item.id)}
                    style={{ 
                        padding: '12px 16px', 
                        cursor: 'pointer',
                        borderLeft: selectedTicketId === item.id ? '4px solid #1890ff' : '4px solid transparent',
                        background: selectedTicketId === item.id ? '#e6f7ff' : 'transparent',
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text strong style={{ color: item.priority === 'CRITICAL' ? 'red' : 'inherit' }}>
                                {item.guestName || item.customer?.fullName || 'Khách vãng lai'}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {new Date(item.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                            </Text>
                        </div>
                        <div style={{ marginBottom: 6 }}>
                            <Text ellipsis style={{ maxWidth: 280, display: 'block' }}>{item.subject}</Text>
                        </div>
                        <div>
                            <Tag color={getPriorityColor(item.priority)}>{item.priority}</Tag>
                            {item.status === 'OPEN' && <Tag color="green">Mới</Tag>}
                        </div>
                    </div>
                </List.Item>
            )}
        />
      </Sider>

      {/* CỘT PHẢI: CHI TIẾT & CHAT */}
      <Content style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {selectedTicketId && ticketDetail ? (
            <>
                {/* HEADER CHI TIẾT */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>
                                [{ticketDetail.ticketCode}] {ticketDetail.subject}
                            </Title>
                            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <Tag color={getPriorityColor(ticketDetail.priority)}>{ticketDetail.priority}</Tag>
                                <Tag>{ticketDetail.status}</Tag>
                                <Text type="secondary"> | </Text>
                                {/* HIỂN THỊ ĐỊNH DANH NGƯỢC */}
                                <Text strong><UserOutlined /> Người liên hệ: {ticketDetail.guestName} ({ticketDetail.guestPhone})</Text>
                                {ticketDetail.customer && (
                                    <Tag color="purple" style={{ marginLeft: 8 }}>
                                        <CheckCircleOutlined /> Đã liên kết: {ticketDetail.customer.fullName}
                                    </Tag>
                                )}
                            </div>
                        </div>
                        <Button type="primary" danger={ticketDetail.status !== 'CLOSED'}>
                            {ticketDetail.status === 'CLOSED' ? 'Mở lại' : 'Đóng Ticket'}
                        </Button>
                    </div>
                    
                    {/* AI SUMMARY BOX */}
                    {ticketDetail.aiAnalysis && (
                        <div style={{ marginTop: 12, padding: 12, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                            <SpaceBetween>
                                <span><RobotOutlined style={{ color: 'green' }} /> <b>AI Summary:</b> {ticketDetail.aiAnalysis.summary}</span>
                                <span>Sentiment: <b>{ticketDetail.aiAnalysis.sentiment}</b></span>
                            </SpaceBetween>
                        </div>
                    )}
                </div>

                {/* KHUNG CHAT (SCROLLABLE) */}
                <div 
                    ref={scrollRef}
                    style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '20px', 
                        background: '#f5f7fa' 
                    }}
                >
                    {/* Tin nhắn đầu tiên (Mô tả lỗi của khách) */}
                    <div style={{ display: 'flex', marginBottom: 20 }}>
                        <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
                        <div style={{ maxWidth: '70%' }}>
                            <Card size="small" title="Yêu cầu hỗ trợ ban đầu">
                                {ticketDetail.description}
                            </Card>
                            <div style={{ fontSize: '11px', color: '#999', marginTop: 4 }}>
                                {new Date(ticketDetail.createdAt).toLocaleString('vi-VN')}
                            </div>
                        </div>
                    </div>

                    <Divider plain style={{ fontSize: 12, color: '#ccc' }}>Lịch sử trao đổi</Divider>
                    
                    {/* List Comment */}
                    {comments.map(renderMessage)}
                    
                    {loadingDetail && <div style={{ textAlign: 'center' }}><Spin /></div>}
                </div>

                {/* FOOTER NHẬP LIỆU */}
                <div style={{ padding: '16px 24px', background: 'white', borderTop: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <TextArea 
                            rows={2} 
                            placeholder="Nhập câu trả lời cho khách hàng (Shift + Enter để xuống dòng)..." 
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleReply();
                                }
                            }}
                        />
                        <Button 
                            type="primary" 
                            icon={<SendOutlined />} 
                            style={{ height: 'auto' }} 
                            onClick={handleReply}
                            loading={submitting}
                        >
                            Gửi
                        </Button>
                    </div>
                </div>
            </>
        ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Empty description="Chọn một ticket để bắt đầu xử lý" />
            </div>
        )}
      </Content>
      
      <style>{`
        .ticket-item:hover { background-color: #fafafa !important; }
      `}</style>
    </Layout>
  );
};

// Helper components
const SpaceBetween = ({ children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{children}</div>
);

export default AgentDashboard;