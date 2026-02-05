/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Table, Tag, Typography, notification, Badge, Tooltip } from 'antd';
import { SoundOutlined, RobotOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient'; // Đảm bảo import đúng
import { createStompClient } from '../services/websocketService';

const { Title, Text } = Typography;

const AgentDashboard = () => {
    const [tickets, setTickets] = useState([]);
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true); // Thêm trạng thái loading
    const stompClient = useRef(null);

    // --- 1. HÀM HELPER & LOGIC ---

    const removeHighlight = useCallback((id) => {
        setTickets((prev) =>
            prev.map((t) => (t.id === id ? { ...t, isNew: false } : t))
        );
    }, []);

    const playAlertSound = useCallback(() => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play blocked (cần tương tác người dùng trước)"));
    }, []);

    // Format ngày giờ: 2026-02-05T10:00 -> 05/02/2026 10:00
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', { hour12: false });
    };

    // Parse Tags từ JSON string: "[\"FRAUD\", \"SCAM\"]" -> Array
    const parseTags = (tagsJson) => {
        try {
            if (!tagsJson) return [];
            // Nếu tagsJson đã là mảng thì trả về luôn, nếu là string thì parse
            return Array.isArray(tagsJson) ? tagsJson : JSON.parse(tagsJson);
        } catch (e) {
            return [];
        }
    };

    // --- 2. EFFECT: LẤY DỮ LIỆU CŨ KHI F5 ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                // Lưu ý: axiosClient baseURL đã sửa thành http://...:8080 nên ở đây giữ nguyên /api/...
                const res = await axiosClient.get('/api/public/tickets');
                setTickets(res);
            } catch (error) {
                console.error("Lỗi tải data:", error);
                notification.error({
                    message: 'Lỗi kết nối', // Antd cũ dùng message
                    title: 'Lỗi kết nối',   // Antd mới dùng title (thêm cả 2 cho chắc)
                    description: 'Không thể lấy danh sách ticket từ Server.'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // --- 3. EFFECT: WEBSOCKET ---
    useEffect(() => {
        stompClient.current = createStompClient(
            // 1. On Connect
            () => setConnected(true),

            // 2. On Update (Nhận ticket mới hoặc update từ AI)
            (data) => {
                // data: TicketNotificationDTO (thường chỉ chứa thông tin thay đổi)

                setTickets((prev) => {
                    const index = prev.findIndex((t) => t.id === data.ticketId);

                    // Hàm helper để parse tags (Backend gửi String "[\"TAG\"]" hoặc Array)
                    const parseSocketTags = (tagsInput) => {
                        if (!tagsInput) return null;
                        if (Array.isArray(tagsInput)) return tagsInput;
                        try { return JSON.parse(tagsInput); } catch { return []; }
                    };

                    // Cấu trúc dữ liệu AI mới từ Socket
                    const newAiAnalysis = {
                        sentiment: data.sentiment,
                        summary: data.summary,
                        tags: parseSocketTags(data.tags) // Xử lý tags
                    };

                    if (index > -1) {
                        // CASE 1: UPDATE (Ticket đã có trong bảng)
                        // Chiến thuật: Giữ nguyên Subject/Date cũ, chỉ đè thông tin AI/Priority mới
                        const newTickets = [...prev];
                        const existingTicket = newTickets[index];

                        newTickets[index] = {
                            ...existingTicket,          // Giữ lại dữ liệu cũ (subject, createdAt...)
                            priority: data.priority,    // Cập nhật Priority mới
                            aiAnalysis: {               // Cập nhật AI mới
                                ...existingTicket.aiAnalysis,
                                ...newAiAnalysis
                            },
                            isNew: true                 // Kích hoạt highlight
                        };
                        return newTickets;
                    } else {
                        // CASE 2: INSERT (Ticket mới hoàn toàn)
                        // Nếu socket thiếu subject/createdAt, dùng giá trị mặc định
                        const newTicket = {
                            id: data.ticketId,
                            ticketCode: data.ticketCode,
                            subject: data.subject || data.summary || "Đang cập nhật...", // Fallback nếu thiếu subject
                            priority: data.priority,
                            createdAt: data.createdAt || new Date().toISOString(),
                            aiAnalysis: newAiAnalysis,
                            isNew: true
                        };
                        return [newTicket, ...prev];
                    }
                });

                // Xóa highlight sau 3 giây
                setTimeout(() => removeHighlight(data.ticketId), 3000);
            },

            // 3. On Alert (Cảnh báo khẩn cấp)
            (alert) => {
                playAlertSound();
                notification.error({
                    title: 'CẢNH BÁO KHẨN CẤP', // Đã sửa: dùng 'title' thay vì 'message'
                    description: `Ticket ${alert.ticketCode}: ${alert.summary || 'Phát hiện rủi ro cao!'}`,
                    duration: 0, // 0 nghĩa là không tự tắt, bắt buộc user phải tắt
                    icon: <SoundOutlined style={{ color: 'red' }} />
                });
            }
        );

        stompClient.current.activate();

        // Cleanup function
        return () => {
            if (stompClient.current) {
                stompClient.current.deactivate();
            }
        };
    }, [removeHighlight, playAlertSound]);

    // --- 4. CẤU HÌNH CỘT BẢNG ---
    const columns = [
        {
            title: 'Mã Ticket',
            dataIndex: 'ticketCode',
            width: 120,
            render: (text) => <Tag color="geekblue">{text}</Tag>
        },
        {
            title: 'Chủ đề',
            dataIndex: 'subject',
            width: 200,
            ellipsis: true,
            render: (text) => <strong>{text}</strong>
        },
        {
            title: 'AI Tóm tắt', // Cột mới quan trọng
            dataIndex: ['aiAnalysis', 'summary'],
            width: 250,
            render: (text) => <Text type="secondary" style={{ fontSize: '13px' }}>{text || 'Đang phân tích...'}</Text>
        },
        {
            title: 'Độ ưu tiên',
            dataIndex: 'priority',
            width: 100,
            render: (priority) => {
                const colors = { CRITICAL: 'red', HIGH: 'orange', MEDIUM: 'blue', LOW: 'cyan' };
                return <Badge status={priority === 'CRITICAL' ? 'processing' : 'default'} color={colors[priority]} text={priority} />;
            }
        },
        {
            title: 'Cảm xúc',
            dataIndex: ['aiAnalysis', 'sentiment'],
            width: 120,
            render: (sentiment) => {
                if (!sentiment) return <Tag>Waiting...</Tag>;
                const color = sentiment === 'NEGATIVE' ? 'error' : sentiment === 'POSITIVE' ? 'success' : 'default';
                return <Tag icon={<RobotOutlined />} color={color}>{sentiment}</Tag>;
            }
        },
        {
            title: 'AI Tags', // Cột mới hiển thị Tags
            dataIndex: ['aiAnalysis', 'tags'],
            render: (tags) => (
                <>
                    {parseTags(tags).map(tag => (
                        <Tag key={tag} color="purple" style={{ marginRight: 2, marginBottom: 2, fontSize: '10px' }}>
                            #{tag}
                        </Tag>
                    ))}
                </>
            )
        },
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            width: 150,
            render: (date) => (
                <Tooltip title={date}>
                    <span><ClockCircleOutlined /> {formatDate(date)}</span>
                </Tooltip>
            )
        },
    ];

    return (
        <div style={{ padding: 24, background: '#fff', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>🛡️ Trung tâm điều hành (Agent Dashboard)</Title>
                    <Text type="secondary">Theo dõi và xử lý sự cố thời gian thực</Text>
                </div>
                <Badge
                    status={connected ? "success" : "default"}
                    text={connected ? <span style={{ color: 'green' }}>● Kết nối ổn định</span> : "Đang kết nối..."}
                />
            </div>

            <Table
                loading={loading}
                dataSource={tickets}
                columns={columns}
                rowKey="id"
                rowClassName={(record) => record.isNew ? 'new-ticket-row' : ''}
                pagination={{ pageSize: 8 }}
                size="middle"
                bordered
            />

            <style>{`
        .new-ticket-row {
          background-color: #fff1f0 !important; /* Màu đỏ nhạt báo hiệu mới */
          animation: flash 1s;
        }
        @keyframes flash {
          0% { background-color: #ffccc7; }
          100% { background-color: #fff1f0; }
        }
      `}</style>
        </div>
    );
};

export default AgentDashboard;