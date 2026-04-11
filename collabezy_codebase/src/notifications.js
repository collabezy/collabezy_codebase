import { insforge } from './lib/insforge.js';

let currentUser = null;
let notificationInterval = null;
let notificationsOpen = false;

export async function initNotifications() {
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (!authData?.user) return null;
    
    currentUser = authData.user;
    console.log('Initializing notifications for user:', currentUser.id);
    await fetchNotifications();
    
    // Poll every 20 seconds
    notificationInterval = setInterval(fetchNotifications, 20000);
    
    return currentUser;
}

export function stopNotificationPolling() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

export async function fetchNotifications() {
    if (!currentUser) return;
    
    try {
        console.log('Fetching notifications for:', currentUser.id);
        const { data: notifications, error } = await insforge.database
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(30);
        
        if (error) {
            console.error('Error fetching notifications:', error);
            return;
        }
        
        console.log('Notifications loaded:', notifications);
        renderNotifications(notifications || []);
    } catch (err) {
        console.error('Exception fetching notifications:', err);
    }
}

function renderNotifications(notifications) {
    const container = document.getElementById('notifications-dropdown');
    const badge = document.getElementById('notification-badge');
    const listContainer = document.getElementById('notifications-list');
    
    if (!container || !badge || !listContainer) {
        console.log('Notification elements not found. Container:', !!container, 'Badge:', !!badge, 'List:', !!listContainer);
        return;
    }
    
    const unreadCount = notifications.filter(n => !n.is_read).length;
    badge.textContent = unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    
    if (notifications.length === 0) {
        listContainer.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text-muted);">
                No notifications yet
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = notifications.map(notif => {
        const timeAgo = getTimeAgo(notif.created_at);
        const isUnread = !notif.is_read;
        const isImportant = ['payment', 'issue', 'dispute'].includes(notif.type);
        
        const refId = notif.reference_id || '';
        
        return `<div class="notification-item ${isUnread ? 'unread' : ''} ${isImportant ? 'important' : ''}">
            <div class="notification-icon">${getNotificationIcon(notif.type)}</div>
            <div class="notification-content">
                <div class="notification-message">${escapeHtml(notif.message)}</div>
                <div class="notification-time">${timeAgo}</div>
            </div>
        </div>`;
    }).join('');

    // Add click handlers after rendering
    const items = listContainer.querySelectorAll('.notification-item');
    items.forEach((item, index) => {
        const notif = notifications[index];
        item.onclick = async () => {
            console.log('Notification clicked:', notif.id, notif.reference_id);
            await handleNotificationClick(notif.id, notif.action_url || '', notif.reference_id || '');
        };
    });
}

function getNotificationIcon(type) {
    const icons = {
        'collab_request': '📩',
        'negotiation_sent': '💰',
        'negotiation_accepted': '✅',
        'negotiation_rejected': '❌',
        'deal_accepted': '🤝',
        'deal_rejected': '❌',
        'payment_pending': '⏳',
        'payment_proof': '📤',
        'payment_confirmed': '✓',
        'payment_issue': '⚠️',
        'work_submitted': '🎬',
        'work_approved': '✅',
        'changes_requested': '🔄',
        'deal_completed': '🎉',
        'message_received': '💬',
        'counter_offer': '💰'
    };
    return icons[type] || '🔔';
}

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
}

export async function handleNotificationClick(notificationId, actionUrl, referenceId) {
    console.log('handleNotificationClick called', { notificationId, actionUrl, referenceId });
    
    // Mark as read
    await markAsRead(notificationId);
    
    // Refresh notifications
    await fetchNotifications();
    
    // Close dropdown
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) dropdown.style.display = 'none';
    notificationsOpen = false;
    
    // Navigate if URL provided
    if (actionUrl) {
        window.location.href = actionUrl;
        return;
    }
    
    // Navigate to deal based on reference_id
    if (referenceId) {
        // Store the ticket ID to open after page loads
        localStorage.setItem('openTicketId', referenceId);
        localStorage.setItem('fromNotification', 'true');
        
        const currentPath = window.location.pathname;
        if (currentPath.includes('brand_') || currentPath.includes('brand_dashboard')) {
            window.location.href = `/brand_deal_detail.html?id=${referenceId}`;
        } else if (currentPath.includes('collab_') || currentPath.includes('dashboard')) {
            window.location.href = `/deal_detail.html?id=${referenceId}`;
        }
    }
}

export async function markAsRead(notificationId) {
    try {
        await insforge.database
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);
    } catch (err) {
        console.error('Error marking notification as read:', err);
    }
}

export async function markAllAsRead() {
    if (!currentUser) return;
    
    try {
        await insforge.database
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);
        
        await fetchNotifications();
    } catch (err) {
        console.error('Error marking all as read:', err);
    }
}

export async function clearAllNotifications() {
    if (!currentUser) return;
    
    try {
        await insforge.database
            .from('notifications')
            .delete()
            .eq('user_id', currentUser.id);
        
        await fetchNotifications();
    } catch (err) {
        console.error('Error clearing all notifications:', err);
    }
}

export async function createNotification({ userId, type, message, referenceId, actionUrl }) {
    console.log('Creating notification for user:', userId, 'type:', type, 'message:', message);
    try {
        const { error } = await insforge.database
            .from('notifications')
            .insert([{
                user_id: userId,
                type: type,
                message: message,
                reference_id: referenceId || null,
                action_url: actionUrl || null
            }]);
        
        if (error) {
            console.error('Error creating notification:', error);
            return { success: false, error };
        }
        console.log('Notification created successfully');
        return { success: true };
    } catch (err) {
        console.error('Error creating notification:', err);
        return { success: false, error: err };
    }
}

// Helper to send notification to the other party in a deal
export async function notifyOtherParty(ticket, currentUserId, type, message, referenceId = null) {
    const otherUserId = ticket.brand_id === currentUserId ? ticket.influencer_id : ticket.brand_id;
    return createNotification({
        userId: otherUserId,
        type: type,
        message: message,
        referenceId: referenceId || ticket.id
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Global toggle function
window.toggleNotifications = function() {
    console.log('toggleNotifications called');
    const dropdown = document.getElementById('notifications-dropdown');
    const bell = document.getElementById('notification-bell');
    
    console.log('Dropdown element:', dropdown);
    console.log('Bell element:', bell);
    
    if (!dropdown) {
        console.log('Dropdown not found!');
        return;
    }
    
    notificationsOpen = !notificationsOpen;
    dropdown.style.display = notificationsOpen ? 'block' : 'none';
    
    console.log('Dropdown display set to:', dropdown.style.display);
    
    if (notificationsOpen) {
        fetchNotifications();
    }
};

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const bell = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notifications-dropdown');
    
    if (bell && dropdown && !bell.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
        notificationsOpen = false;
    }
});

// Make functions globally accessible
window.handleNotificationClick = handleNotificationClick;
window.markAllAsRead = markAllAsRead;
window.clearAllNotifications = clearAllNotifications;
