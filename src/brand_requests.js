import { insforge } from './lib/insforge.js';
import { createNotification, fetchNotifications, stopNotificationPolling, initNotifications } from './notifications.js';

let currentUser = null;
let allTickets = [];
let allInfluencers = [];
let allPromos = [];
let currentTicket = null;
let messagePollInterval = null;
let paymentProofFile = null;

const requestsContainer = document.getElementById('requests-container');
const logoutBtn = document.getElementById('logout-btn');
const closeBtn = document.getElementById('close-modal-btn');
const submitCounterBtn = document.getElementById('submit-counter-btn');
const cancelCounterBtn = document.getElementById('cancel-counter-btn');

const CONTACT_PATTERNS = [/@/, /\d{10}/, /whatsapp/i, /watsapp/i, /instagram/i, /dm\s*me/i, /contact\s*me/i, /phone/i, /telegram/i, /signal/i, /call\s*me/i];

function containsContactInfo(text) {
    return CONTACT_PATTERNS.some(p => p.test(text));
}

async function getNotificationContext(ticket) {
    const influencer = allInfluencers.find(i => i.user_id === ticket.influencer_id);
    const promo = allPromos.find(p => p.id === ticket.promotion_request_id);
    
    const { data: brandProfile } = await insforge.database
        .from('brand_profiles_new')
        .select('brand_name')
        .eq('user_id', currentUser.id)
        .single();
    
    return {
        brandName: brandProfile?.brand_name || 'A brand',
        influencerName: influencer?.name || 'the influencer',
        productName: promo?.product_name || 'Direct Deal',
        amount: ticket.proposed_amount || ticket.final_amount || '0'
    };
}

window.updatePaymentFields = async function() {
    const paymentType = document.querySelector('input[name="payment-type"]:checked').value;
    const paymentNumSection = document.getElementById('payment-number-section');
    const paymentNumSelect = document.getElementById('payment-number');
    const amountInput = document.getElementById('payment-amount-input');
    const totalDisplay = document.getElementById('total-amount-display');
    const totalAmount = currentTicket?.final_amount || currentTicket?.proposed_amount || 0;

    if (paymentType === 'partial') {
        paymentNumSection.style.display = 'block';
        
        // Check if first payment is already done
        const { data: existingPayments } = await insforge.database
            .from('payments')
            .select('payment_number, amount')
            .eq('ticket_id', currentTicket.id);
        
        const paidPayments = existingPayments?.map(p => p.payment_number) || [];
        
        // Disable already paid payment options
        Array.from(paymentNumSelect.options).forEach((option) => {
            const pNum = parseInt(option.value);
            option.disabled = paidPayments.includes(pNum);
        });
        
        // Set default to next available payment
        if (paidPayments.includes(1)) {
            paymentNumSelect.value = '2';
        } else {
            paymentNumSelect.value = '1';
        }
        
        // Calculate remaining amount
        const totalPaid = existingPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
        const remaining = totalAmount - totalPaid;
        amountInput.value = remaining > 0 ? remaining : '';
        totalDisplay.textContent = `Total: ₹${totalAmount} | Paid: ₹${totalPaid} | Remaining: ₹${remaining}`;
    } else {
        paymentNumSection.style.display = 'none';
        amountInput.value = totalAmount;
        totalDisplay.textContent = `Total Deal Value: ₹${totalAmount}`;
    }
};

window.addEventListener('DOMContentLoaded', async () => {
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (!authData?.user) {
        window.location.href = '/brand_auth.html';
        return;
    }
    currentUser = authData.user;

    const { data: profile } = await insforge.database
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (profile?.role === 'INFLUENCER' && currentUser.email !== 'influencerbrandcollaboration@gmail.com') {
        window.location.href = '/index.html';
        return;
    }

    await loadRequests();
    
    // Clear stored values - no auto-open modal when leaving detail page
    localStorage.removeItem('openTicketId');
    localStorage.removeItem('fromNotification');

    initNotifications();
});

async function loadRequests() {
    requestsContainer.innerHTML = '<p class="subtitle text-center">Loading active deals...</p>';

    const { data: tickets, error: tError } = await insforge.database
        .from('tickets')
        .select('*')
        .eq('brand_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (tError || !tickets) {
        requestsContainer.innerHTML = '<p class="error text-center mt-4">Failed to load deals.</p>';
        return;
    }

    if (tickets.length === 0) {
        requestsContainer.innerHTML = '<p class="subtitle text-center mt-8">No active deals yet. Discover influencers and send them collaboration requests!</p>';
        return;
    }

    const influencerIds = [...new Set(tickets.map(t => t.influencer_id))];
    const { data: influencerProfiles } = await insforge.database
        .from('influencer_profiles')
        .select('*')
        .in('user_id', influencerIds);

    const promoIds = [...new Set(tickets.filter(t => t.promotion_request_id).map(t => t.promotion_request_id))];
    let promoData = [];
    if (promoIds.length > 0) {
        const { data: promos } = await insforge.database
            .from('promotion_requests')
            .select('*')
            .in('id', promoIds);
        promoData = promos || [];
    }

    allTickets = tickets;
    allInfluencers = influencerProfiles || [];
    allPromos = promoData;

    renderRequests();
}

function renderRequests() {
    requestsContainer.innerHTML = '';
    
    allTickets.forEach(ticket => {
        const influencer = allInfluencers.find(i => i.user_id === ticket.influencer_id);
        const promo = allPromos.find(p => p.id === ticket.promotion_request_id);
        
        const card = document.createElement('div');
        card.className = 'glass-panel request-card';
        
        const statusClass = `status-${ticket.status.toLowerCase()}`;
        
        card.innerHTML = `
            <img src="${influencer?.avatar_url || 'https://via.placeholder.com/50'}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.1);">
            <div style="flex: 1;">
                <div class="flex-between mb-2">
                    <h3 style="font-size: 1.25rem;">${influencer?.name || 'Unknown Influencer'}</h3>
                    <span class="status-badge ${statusClass}">${ticket.status.replace(/_/g, ' ')}</span>
                </div>
                <p class="subtitle mb-2">Campaign: <strong>${promo?.product_name || 'Direct Deal'}</strong></p>
                <div style="font-size: 0.9rem; color: #94a3b8; margin-bottom: 1rem;">Offered: <strong style="color: #10b981;">₹ ${ticket.proposed_amount || '0'}</strong></div>
                ${renderBrandFeedbackBlock(ticket)}
            </div>
        `;
        
        card.onclick = () => window.location.href = `/brand_deal_detail.html?id=${ticket.id}`;
        requestsContainer.appendChild(card);
    });
}

function renderBrandFeedbackBlock(ticket) {
    if (ticket.status === 'PENDING') {
        return `<p style="font-size: 0.85rem; color: #f59e0b; font-style: italic;">Awaiting influencer response...</p>`;
    }
    if (ticket.status === 'ACCEPTED') {
        return `<p style="font-size: 0.85rem; color: #10b981; font-style: italic;">Influencer accepted — Upload payment proof</p>`;
    }
    if (ticket.status === 'REJECTED') {
        return `<p style="font-size: 0.85rem; color: #ef4444; font-style: italic;">Influencer declined this offer.</p>`;
    }
    if (ticket.status === 'NEGOTIATION') {
        return `<p style="font-size: 0.85rem; color: #6366f1; font-style: italic;">In negotiation — send a counter-offer</p>`;
    }
    if (ticket.status === 'PAYMENT_PROOF_SUBMITTED') {
        return `<p style="font-size: 0.85rem; color: #22d3ee; font-style: italic;">Payment proof submitted — awaiting confirmation</p>`;
    }
    if (ticket.status === 'PAYMENT_CONFIRMED') {
        return `<p style="font-size: 0.85rem; color: #10b981; font-style: italic;">Payment confirmed — awaiting work</p>`;
    }
    if (ticket.status === 'WORK_SUBMITTED') {
        return `<p style="font-size: 0.85rem; color: #a855f7; font-style: italic;">Work submitted — review and approve</p>`;
    }
    if (ticket.status === 'CHANGES_REQUESTED') {
        return `<p style="font-size: 0.85rem; color: #f59e0b; font-style: italic;">Changes requested — awaiting resubmission</p>`;
    }
    return '';
}

async function renderBrandActionButtons(ticket) {
    const container = document.getElementById('action-buttons');
    container.innerHTML = '';

    switch (ticket.status) {
        case 'PENDING':
            container.innerHTML = `
                <button class="btn btn-secondary" onclick="showBrandCounterOffer()" style="flex:1;border-color:#6366f1;color:#6366f1;">💰 Counter Offer</button>
            `;
            break;
        case 'NEGOTIATION':
            container.innerHTML = `
                <button class="btn btn-secondary" onclick="showBrandCounterOffer()" style="flex:1;border-color:#6366f1;color:#6366f1;">💰 Counter Offer</button>
            `;
            break;
        case 'ACCEPTED':
            // Check if payments have been made
            const { data: existingPayments } = await insforge.database
                .from('payments')
                .select('amount, payment_number')
                .eq('ticket_id', ticket.id);
            
            if (existingPayments && existingPayments.length > 0) {
                const totalPaid = existingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                const totalDeal = parseFloat(ticket.final_amount || ticket.proposed_amount || 0);
                
                if (totalPaid >= totalDeal) {
                    container.innerHTML = `<p style="color:#10b981;font-weight:bold;margin:0 auto;">✓ Full Payment Done — Awaiting Work</p>`;
                } else {
                    const paymentCount = existingPayments.length;
                    container.innerHTML = `<p style="color:#f59e0b;font-weight:bold;margin:0 auto;">✓ Partial Payment ${paymentCount}/2 Done (₹${totalPaid}/${totalDeal}) — <button onclick="showPaymentSection()" style="background:none;border:none;color:#8b5cf6;cursor:pointer;text-decoration:underline;">Add More</button></p>`;
                }
            } else {
                container.innerHTML = `<button class="btn btn-primary" onclick="showPaymentSection()" style="flex:1;">💰 Upload Payment Proof</button>`;
            }
            break;
        case 'REJECTED':
        case 'CANCELLED':
            container.innerHTML = `<p style="color:#ef4444;font-weight:bold;margin:0 auto;">✕ Deal ${ticket.status}</p>`;
            break;
        case 'PAYMENT_PENDING':
            container.innerHTML = `<p style="color:#ec4899;font-weight:bold;margin:0 auto;">⏳ Payment Pending</p>`;
            break;
        case 'PAYMENT_PROOF_SUBMITTED':
            container.innerHTML = `<p style="color:#22d3ee;font-weight:bold;margin:0 auto;">📤 Payment Proof Submitted — Awaiting Confirmation</p>`;
            break;
        case 'PAYMENT_CONFIRMED':
            container.innerHTML = `<p style="color:#10b981;font-weight:bold;margin:0 auto;">✓ Payment Confirmed — Awaiting Work</p>`;
            break;
        case 'WORK_SUBMITTED':
            container.innerHTML = `
                <button class="btn btn-primary" onclick="approveWork('${ticket.id}')" style="flex:1;">✓ Approve Work</button>
                <button class="btn btn-secondary" onclick="requestChanges('${ticket.id}')" style="flex:1;border-color:#f59e0b;color:#f59e0b;">🔄 Request Changes</button>
            `;
            break;
        case 'CHANGES_REQUESTED':
            container.innerHTML = `<p style="color:#f59e0b;font-weight:bold;margin:0 auto;">🔄 Changes Requested — Awaiting Resubmission</p>`;
            break;
        case 'COMPLETED':
            container.innerHTML = `<p style="color:#22c55e;font-weight:bold;margin:0 auto;">🎉 Deal Completed!</p>`;
            break;
    }
}

window.showPaymentSection = function() {
    const paymentSection = document.getElementById('payment-section');
    paymentSection.style.display = 'block';
    paymentSection.scrollIntoView({ behavior: 'smooth' });
};

async function openTicketDetail(ticketId) {
    currentTicket = allTickets.find(t => t.id === ticketId);
    if (!currentTicket) return;

    const influencer = allInfluencers.find(i => i.user_id === currentTicket.influencer_id);
    const promo = allPromos.find(p => p.id === currentTicket.promotion_request_id);

    document.getElementById('detail-product').textContent = promo ? promo.product_name : 'Direct Deal';
    document.getElementById('detail-influencer').textContent = influencer ? influencer.name : 'Unknown';
    document.getElementById('detail-platform').textContent = promo?.platform || 'Not specified';
    document.getElementById('detail-amount').textContent = currentTicket.proposed_amount ? `₹ ${currentTicket.proposed_amount}` : 'Not set';
    
    const deadlineEl = document.getElementById('detail-deadline');
    if (currentTicket.deadline) {
        deadlineEl.textContent = new Date(currentTicket.deadline).toLocaleDateString();
    } else {
        deadlineEl.textContent = 'Not set';
    }

    const finalAmountRow = document.getElementById('final-amount-row');
    const finalAmountEl = document.getElementById('detail-final-amount');
    if (currentTicket.final_amount) {
        finalAmountRow.style.display = 'block';
        finalAmountEl.textContent = `₹ ${currentTicket.final_amount}`;
    } else {
        finalAmountRow.style.display = 'none';
    }

    const promoSection = document.getElementById('detail-promo-section');
    if (promo) {
        promoSection.style.display = 'block';
        document.getElementById('detail-promo-desc').textContent = promo.description || 'No description.';
    } else {
        promoSection.style.display = 'none';
    }

    paymentProofFile = null;
    document.getElementById('payment-upload-name').textContent = '';
    document.getElementById('payment-amount-input').value = currentTicket.final_amount || currentTicket.proposed_amount || '';
    document.getElementById('total-amount-display').textContent = `Total Deal Value: ₹${currentTicket.final_amount || currentTicket.proposed_amount || '0'}`;
    document.getElementById('payment-section').style.display = 'none';
    
    // Show influencer UPI ID if available
    const upiSection = document.getElementById('influencer-upi-section');
    if (influencer?.upi_id) {
        upiSection.style.display = 'block';
        document.getElementById('influencer-upi-id').textContent = influencer.upi_id;
    } else {
        upiSection.style.display = 'block';
        document.getElementById('influencer-upi-id').textContent = 'Not provided';
    }
    
    updatePaymentFields();
    
    await loadWorkSubmission(ticketId);
    await loadPaymentHistory(ticketId);
    renderBrandActionButtons(currentTicket);
    document.getElementById('counter-offer-section').style.display = 'none';

    document.getElementById('detail-modal').style.display = 'block';
    loadMessages(ticketId);
}

async function loadWorkSubmission(ticketId) {
    const section = document.getElementById('work-section');
    const content = document.getElementById('work-submission-content');
    
    const { data: submissions } = await insforge.database
        .from('submissions')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    if (submissions && submissions.length > 0) {
        section.style.display = 'block';
        const submissionsHtml = submissions.map((sub, index) => {
            const submissionDate = sub.created_at ? new Date(sub.created_at).toLocaleString() : 'Unknown';
            const isLatest = index === submissions.length - 1;
            return `
                <div class="submission-link" style="${isLatest ? 'border-left: 3px solid #10b981; padding-left: 0.75rem; margin-bottom: 1rem;' : 'border-left: 3px solid #6366f1; padding-left: 0.75rem; margin-bottom: 1rem; opacity: 0.7;'}">
                    <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;">
                        ${isLatest ? 'Latest Submission' : `Submission #${index + 1}`} — ${submissionDate}
                    </p>
                    <a href="${sub.submission_url}" target="_blank" style="color: #8b5cf6;">${sub.submission_url}</a>
                    ${sub.notes ? `<p style="margin-top:0.5rem;font-size:0.85rem;color:#e2e8f0;">Note: ${sub.notes}</p>` : ''}
                </div>
            `;
        }).join('');
        content.innerHTML = submissionsHtml;
    } else {
        section.style.display = 'none';
    }
}

async function loadPaymentHistory(ticketId) {
    const section = document.getElementById('payment-history-section');
    const content = document.getElementById('payment-history-content');
    
    const { data: payments } = await insforge.database
        .from('payments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    const { data: ticket } = await insforge.database
        .from('tickets')
        .select('proposed_amount, final_amount')
        .eq('id', ticketId)
        .single();
    
    const totalAmount = parseFloat(ticket?.final_amount || ticket?.proposed_amount || 0);
    
    if (payments && payments.length > 0) {
        section.style.display = 'block';
        const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const remaining = totalAmount - totalPaid;
        
        let paymentsHtml = `<div style="margin-bottom: 1rem; padding: 0.75rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
            <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">Total Deal: ₹${totalAmount} | Paid: ₹${totalPaid} | Remaining: ₹${remaining}</p>
            <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0}%; background: linear-gradient(90deg, #10b981, #22c55e);"></div>
            </div>
        </div>`;
        
        paymentsHtml += payments.map((p, index) => {
            const paymentDate = p.created_at ? new Date(p.created_at).toLocaleString() : 'Unknown';
            const paymentTypeLabel = p.payment_type === 'partial' ? `Payment ${p.payment_number} (${p.payment_number === 1 ? 'Before Work' : 'After Work'})` : 'Full Payment';
            return `
                <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-weight: 600;">${paymentTypeLabel}</span>
                        <span style="color: #10b981; font-size: 1.1rem;">₹${p.amount}</span>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">${paymentDate}</p>
                    ${p.proof_url ? `<a href="${p.proof_url}" target="_blank" style="font-size: 0.85rem; color: #8b5cf6;">📎 View Proof</a>` : ''}
                </div>
            `;
        }).join('');
        
        content.innerHTML = paymentsHtml;
    } else {
        section.style.display = 'none';
    }
}

async function loadMessages(ticketId) {
    const chatContainer = document.getElementById('chat-container');
    
    // Always show the messaging section for COMPLETED deals too
    const msgSection = chatContainer.closest('.detail-section');
    if (msgSection) {
        msgSection.style.display = 'block';
    }
    
    chatContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;">Loading messages...</p>';

    console.log('Loading messages for ticket:', ticketId);
    
    try {
        const { data: messages, error } = await insforge.database
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        console.log('Messages loaded:', messages, 'error:', error);

        if (error) {
            chatContainer.innerHTML = `<p style="color:#ef4444;font-size:0.85rem;text-align:center;">Error: ${error.message}</p>`;
            return;
        }
        
        if (!messages || messages.length === 0) {
            chatContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;">No messages yet. Start the conversation!</p>';
        } else {
            chatContainer.innerHTML = '';
            messages.forEach(msg => {
                const isSent = msg.sender_id === currentUser.id;
                const senderName = isSent ? 'You' : 'Influencer';
                addMessageToChat(senderName, msg.message, isSent, msg.created_at);
            });
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    } catch (err) {
        console.error('Exception loading messages:', err);
        chatContainer.innerHTML = `<p style="color:#ef4444;font-size:0.85rem;text-align:center;">Error: ${err.message}</p>`;
    }
}

function addMessageToChat(sender, text, isSent, time) {
    const chatContainer = document.getElementById('chat-container');
    
    // Remove "No messages yet" placeholder if it exists
    const noMessagesEl = chatContainer.querySelector('p[style*="No messages yet"]');
    if (noMessagesEl) {
        noMessagesEl.remove();
    }
    
    const div = document.createElement('div');
    div.className = `chat-msg ${isSent ? 'sent' : 'received'}`;
    div.innerHTML = `
        <div class="chat-sender">${sender}</div>
        <div class="chat-text">${escapeHtml(text)}</div>
        <div class="chat-time">${time ? new Date(time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : 'Just now'}</div>
    `;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const sendMsgBtn = document.getElementById('send-msg-btn');
const chatInput = document.getElementById('chat-input');
const chatWarning = document.getElementById('chat-warning');

sendMsgBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !currentTicket) return;

    if (currentTicket.status === 'REJECTED' || currentTicket.status === 'COMPLETED') {
        alert('Cannot send messages on rejected or completed deals.');
        return;
    }

    if (containsContactInfo(text)) {
        chatWarning.style.display = 'block';
        setTimeout(() => { chatWarning.style.display = 'none'; }, 4000);
        return;
    }

    const btn = sendMsgBtn;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '...';

    const { error } = await insforge.database
        .from('ticket_messages')
        .insert([{
            ticket_id: currentTicket.id,
            sender_id: currentUser.id,
            message: text
        }]);

    btn.disabled = false;
    btn.textContent = originalText;
    
    if (error) {
        alert('Error sending message: ' + error.message);
    } else {
        chatInput.value = '';
        addMessageToChat('You', text, true);

        const ctx = await getNotificationContext(currentTicket);
        await createNotification({
            userId: currentTicket.influencer_id,
            type: 'message_received',
            message: `💬 ${ctx.brandName} sent you a message about "${ctx.productName}"`,
            referenceId: currentTicket.id
        });
    }
}

closeBtn.addEventListener('click', () => {
    document.getElementById('detail-modal').style.display = 'none';
    if (messagePollInterval) clearInterval(messagePollInterval);
    currentTicket = null;
    paymentProofFile = null;
});

document.getElementById('close-modal-bottom-btn')?.addEventListener('click', () => {
    document.getElementById('detail-modal').style.display = 'none';
    if (messagePollInterval) clearInterval(messagePollInterval);
    currentTicket = null;
    paymentProofFile = null;
});

window.showBrandCounterOffer = () => {
    document.getElementById('counter-offer-section').style.display = 'block';
    document.getElementById('counter-amount').value = currentTicket.proposed_amount || '';
    document.getElementById('counter-amount').focus();
};

submitCounterBtn.addEventListener('click', async () => {
    const amount = document.getElementById('counter-amount').value.trim();
    if (!amount) {
        alert('Please enter your proposed amount.');
        return;
    }

    const { error } = await insforge.database
        .from('tickets')
        .update({ proposed_amount: amount, status: 'NEGOTIATION' })
        .eq('id', currentTicket.id);

    if (error) {
        alert('Error: ' + error.message);
    } else {
        document.getElementById('counter-offer-section').style.display = 'none';
        await loadRequests();
        currentTicket = allTickets.find(t => t.id === currentTicket.id);
        if (currentTicket) renderBrandActionButtons(currentTicket);
        
        await insforge.database.from('ticket_messages').insert([{
            ticket_id: currentTicket.id,
            sender_id: currentUser.id,
            message: `💰 Counter offer sent: ₹${amount}`
        }]);

        const ctx = await getNotificationContext(currentTicket);
        await createNotification({
            userId: currentTicket.influencer_id,
            type: 'counter_offer',
            message: `💰 ${ctx.brandName} sent a counter offer of ₹${amount} for "${ctx.productName}"`,
            referenceId: currentTicket.id
        });
        
        loadMessages(currentTicket.id);
    }
});

document.getElementById('cancel-counter-btn')?.addEventListener('click', () => {
    document.getElementById('counter-offer-section').style.display = 'none';
    document.getElementById('counter-amount').value = '';
});

window.handlePaymentUpload = function(input) {
    if (input.files && input.files[0]) {
        paymentProofFile = input.files[0];
        document.getElementById('payment-upload-name').textContent = paymentProofFile.name;
    }
};

window.submitPaymentProof = async function() {
    if (!paymentProofFile || !currentTicket) {
        alert('Please upload a payment proof image first.');
        return;
    }

    const paymentAmount = document.getElementById('payment-amount-input').value;
    if (!paymentAmount || paymentAmount <= 0) {
        alert('Please enter the payment amount.');
        return;
    }

    const paymentType = document.querySelector('input[name="payment-type"]:checked').value;
    const paymentNumber = paymentType === 'partial' ? parseInt(document.getElementById('payment-number').value) : 1;

    const btn = document.getElementById('submit-payment-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading...';

    try {
        const filePath = `payments/${currentTicket.id}_${Date.now()}.${paymentProofFile.name.split('.').pop()}`;
        
        const { data: uploadData, error: uploadErr } = await insforge.storage.from('payments').upload(filePath, paymentProofFile);
        
        if (uploadErr) throw uploadErr;

        const { data: publicUrlData } = await insforge.storage.from('payments').getPublicUrl(filePath);
        let proofUrl = publicUrlData?.publicUrl || uploadData?.url;

        if (!proofUrl) {
            const baseUrl = insforge.storage.from('payments').baseUrl || 'https://y74647nz.ap-southeast.insforge.app';
            proofUrl = `${baseUrl}/storage/v1/object/public/payments/${filePath}`;
        }

        await insforge.database.from('payments').insert([{
            ticket_id: currentTicket.id,
            amount: paymentAmount,
            proof_url: proofUrl,
            payment_type: paymentType,
            payment_number: paymentNumber
        }]);

        // Determine new status based on payment type
        let newStatus = 'PAYMENT_PROOF_SUBMITTED';
        if (paymentType === 'partial' && paymentNumber === 1) {
            // First partial payment done - still wait for second payment after work
            newStatus = 'PAYMENT_PROOF_SUBMITTED'; // Keep same status but payment is recorded
        }

        const { error } = await insforge.database
            .from('tickets')
            .update({ status: newStatus })
            .eq('id', currentTicket.id);

        if (error) throw error;

        const ctx = await getNotificationContext(currentTicket);
        const paymentLabel = paymentType === 'partial' ? `Payment ${paymentNumber} (${paymentNumber === 1 ? 'Before Work' : 'After Work'})` : 'Full Payment';
        
        await createNotification({
            userId: currentTicket.influencer_id,
            type: 'payment_proof',
            message: `📤 ${ctx.brandName} uploaded ${paymentLabel} proof of ₹${paymentAmount} for "${ctx.productName}". Please confirm once received.`,
            referenceId: currentTicket.id
        });

        paymentProofFile = null;
        document.getElementById('payment-upload-name').textContent = '';
        
        await loadRequests();
        currentTicket = allTickets.find(t => t.id === currentTicket.id);
        if (currentTicket) renderBrandActionButtons(currentTicket);

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Payment Proof';
    }
};

window.approveWork = async function(ticketId) {
    if (!confirm('Approve this work and complete the deal?')) return;

    const ticket = allTickets.find(t => t.id === ticketId);
    const ctx = await getNotificationContext(ticket);

    const { error } = await insforge.database
        .from('tickets')
        .update({ status: 'COMPLETED' })
        .eq('id', ticketId);

    if (error) {
        alert('Error: ' + error.message);
    } else {
        await createNotification({
            userId: ticket.influencer_id,
            type: 'work_approved',
            message: `✅ ${ctx.brandName} approved your work for "${ctx.productName}"! Deal completed successfully 🎉`,
            referenceId: ticketId
        });

        await loadRequests();
        currentTicket = allTickets.find(t => t.id === ticketId);
        if (currentTicket) renderBrandActionButtons(currentTicket);
    }
};

window.requestChanges = async function(ticketId) {
    const note = prompt('Describe the changes you want:');
    if (!note) return;

    const ticket = allTickets.find(t => t.id === ticketId);
    const ctx = await getNotificationContext(ticket);

    await insforge.database.from('ticket_messages').insert([{
        ticket_id: ticketId,
        sender_id: currentUser.id,
        message: `🔄 Changes requested: ${note}`
    }]);

    const { error } = await insforge.database
        .from('tickets')
        .update({ status: 'CHANGES_REQUESTED' })
        .eq('id', ticketId);

    if (error) {
        alert('Error: ' + error.message);
    } else {
        await createNotification({
            userId: ticket.influencer_id,
            type: 'changes_requested',
            message: `🔄 ${ctx.brandName} requested changes for "${ctx.productName}": ${note}`,
            referenceId: ticketId
        });

        await loadRequests();
        currentTicket = allTickets.find(t => t.id === ticketId);
        if (currentTicket) renderBrandActionButtons(currentTicket);
    }
};

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    stopNotificationPolling();
    await insforge.auth.signOut();
    window.location.href = '/index.html';
});