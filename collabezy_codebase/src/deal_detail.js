import { insforge } from './lib/insforge.js';
import { createNotification, initNotifications } from './notifications.js';

let currentUser = null;
let currentTicket = null;
let allBrands = [];
let allPromos = [];
let allInfluencers = [];
let messagePollInterval = null;
let paymentProofFile = null;

const CONTACT_PATTERNS = [/@/, /\d{10}/, /whatsapp/i, /watsapp/i, /instagram/i, /dm\s*me/i, /contact\s*me/i, /phone/i, /telegram/i, /signal/i, /call\s*me/i];

function containsContactInfo(text) {
    return CONTACT_PATTERNS.some(p => p.test(text));
}

window.toggleSection = function(header) {
    const content = header.nextElementSibling;
    const toggle = header.querySelector('.expandable-toggle');
    content.classList.toggle('show');
    toggle.classList.toggle('open');
};

window.addEventListener('DOMContentLoaded', async () => {
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (!authData?.user) {
        window.location.href = '/auth.html';
        return;
    }
    currentUser = authData.user;

    const urlParams = new URLSearchParams(window.location.search);
    const ticketId = urlParams.get('id');
    
    if (!ticketId) {
        window.location.href = '/collab_requests.html';
        return;
    }

    await loadDealDetails(ticketId);
    initNotifications();
});

async function loadDealDetails(ticketId) {
    // Load ticket
    const { data: ticket, error: ticketError } = await insforge.database
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

    if (ticketError || !ticket) {
        alert('Deal not found');
        window.location.href = '/collab_requests.html';
        return;
    }

    currentTicket = ticket;

    // Load brand profile
    const { data: brandProfile } = await insforge.database
        .from('brand_profiles_new')
        .select('*')
        .eq('user_id', ticket.brand_id)
        .single();

    allBrands = brandProfile ? [brandProfile] : [];

    // Load influencer profile if user is brand
    const { data: influencerProfile } = await insforge.database
        .from('influencer_profiles')
        .select('*')
        .eq('user_id', ticket.influencer_id)
        .single();
    
    allInfluencers = influencerProfile ? [influencerProfile] : [];

    // Load promo if exists
    if (ticket.promotion_request_id) {
        const { data: promo } = await insforge.database
            .from('promotion_requests')
            .select('*')
            .eq('id', ticket.promotion_request_id)
            .single();
        allPromos = promo ? [promo] : [];
    }

    const promo = allPromos[0];
    const brand = allBrands[0];
    const influencer = allInfluencers[0];

    // Update header
    document.getElementById('deal-product').textContent = promo ? promo.product_name : 'Direct Deal';
    document.getElementById('deal-brand').textContent = brand ? `From: ${brand.brand_name}` : 'Unknown Brand';

    // Update product details
    document.getElementById('detail-platform').textContent = promo?.platform || 'Not specified';
    document.getElementById('detail-amount').textContent = ticket.proposed_amount ? `₹ ${ticket.proposed_amount}` : 'Not set';
    
    const statusEl = document.getElementById('deal-status');
    statusEl.textContent = ticket.status.replace(/_/g, ' ');
    statusEl.className = `status-badge status-${ticket.status.toLowerCase()}`;

    if (ticket.final_amount) {
        document.getElementById('final-amount-row').style.display = 'flex';
        document.getElementById('detail-final-amount').textContent = `₹ ${ticket.final_amount}`;
    }

    if (promo) {
        document.getElementById('detail-promo-section').style.display = 'block';
        document.getElementById('detail-promo-desc').textContent = promo.description || 'No description.';
    }

    // Show appropriate sections based on user role
    const isBrand = ticket.brand_id === currentUser.id;
    const isInfluencer = ticket.influencer_id === currentUser.id;

    // Show submit work section for influencers if status allows
    if (isInfluencer && (ticket.status === 'PAYMENT_CONFIRMED' || ticket.status === 'ACCEPTED' || ticket.status === 'WORK_SUBMITTED' || ticket.status === 'CHANGES_REQUESTED')) {
        document.getElementById('submit-work-section').style.display = 'block';
    }

    // Show payment upload for brands
    if (isBrand && ticket.status === 'ACCEPTED') {
        document.getElementById('brand-payment-section').style.display = 'block';
        
        // Show UPI ID
        if (influencer?.upi_id) {
            document.getElementById('influencer-upi-id').textContent = influencer.upi_id;
        } else {
            document.getElementById('influencer-upi-id').textContent = 'Not provided';
        }

        // Set default amount
        document.getElementById('payment-amount-input').value = ticket.final_amount || ticket.proposed_amount || '';
        document.getElementById('total-amount-display').textContent = `Total Deal Value: ₹${ticket.final_amount || ticket.proposed_amount || '0'}`;
    }

    // Load payment history
    await loadPaymentHistory(ticketId);

    // Load work submissions
    await loadWorkSubmissions(ticketId);

    // Load chat
    await loadMessages(ticketId);

    // Setup message sending
    document.getElementById('send-msg-btn').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    // Setup work submission
    document.getElementById('submit-work-btn').addEventListener('click', submitWork);

    // Start polling for new messages
    messagePollInterval = setInterval(() => loadMessages(ticketId), 5000);
}

async function loadPaymentHistory(ticketId) {
    const { data: payments } = await insforge.database
        .from('payments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    const summaryEl = document.getElementById('payment-summary');
    const listEl = document.getElementById('payment-list');

    const totalAmount = parseFloat(currentTicket.final_amount || currentTicket.proposed_amount || 0);
    const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
    const remaining = totalAmount - totalPaid;

    if (payments && payments.length > 0) {
        summaryEl.innerHTML = `
            <div style="padding: 0.75rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
                <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">Total Deal: ₹${totalAmount} | Received: ₹${totalPaid} | Remaining: ₹${remaining}</p>
                <div class="payment-progress-bar">
                    <div class="payment-progress-fill" style="width: ${totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0}%;"></div>
                </div>
            </div>
        `;

        listEl.innerHTML = payments.map((p) => {
            const paymentDate = p.created_at ? new Date(p.created_at).toLocaleString() : 'Unknown';
            const paymentTypeLabel = p.payment_type === 'partial' ? `Payment ${p.payment_number} (${p.payment_number === 1 ? 'Before Work' : 'After Work'})` : 'Full Payment';
            return `
                <div class="payment-history-item">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-weight: 600;">${paymentTypeLabel}</span>
                        <span style="color: #10b981; font-size: 1.1rem;">₹${p.amount}</span>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">${paymentDate}</p>
                    ${p.proof_url ? `<a href="${p.proof_url}" target="_blank" style="font-size: 0.85rem; color: #8b5cf6;">📎 View Proof</a>` : ''}
                </div>
            `;
        }).join('');
    } else {
        summaryEl.innerHTML = '<p class="no-section-data">No payments yet</p>';
        listEl.innerHTML = '';
    }
}

async function loadWorkSubmissions(ticketId) {
    const { data: submissions } = await insforge.database
        .from('submissions')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    const listEl = document.getElementById('work-list');

    if (submissions && submissions.length > 0) {
        listEl.innerHTML = submissions.map((sub, index) => {
            const submissionDate = sub.created_at ? new Date(sub.created_at).toLocaleString() : 'Unknown';
            const isLatest = index === submissions.length - 1;
            return `
                <div class="work-submission-item ${isLatest ? 'latest' : ''}">
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                        ${isLatest ? 'Latest Submission' : `Submission #${index + 1}`} — ${submissionDate}
                    </p>
                    <a href="${sub.submission_url}" target="_blank" style="color: #8b5cf6;">${sub.submission_url}</a>
                    ${sub.notes ? `<p style="margin-top: 0.5rem; font-size: 0.85rem; color: #e2e8f0;">Note: ${sub.notes}</p>` : ''}
                </div>
            `;
        }).join('');
    } else {
        listEl.innerHTML = '<p class="no-section-data">No work submitted yet</p>';
    }
}

async function loadMessages(ticketId) {
    const chatContainer = document.getElementById('chat-container');
    
    const { data: messages, error } = await insforge.database
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    if (error) {
        chatContainer.innerHTML = `<p style="color: #ef4444; font-size: 0.85rem; text-align: center;">Error: ${error.message}</p>`;
        return;
    }

    if (!messages || messages.length === 0) {
        chatContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">No messages yet. Start the conversation!</p>';
        return;
    }

    // Only add new messages if they don't exist
    const existingMsgIds = Array.from(chatContainer.querySelectorAll('.chat-msg')).map(el => el.dataset.id);
    const newMessages = messages.filter(m => !existingMsgIds.includes(m.id));

    if (newMessages.length > 0) {
        newMessages.forEach(msg => {
            const isSent = msg.sender_id === currentUser.id;
            const senderName = isSent ? 'You' : 'Brand';
            addMessageToChat(senderName, msg.message, isSent, msg.created_at, msg.id);
        });
    }
}

function addMessageToChat(sender, text, isSent, time, msgId) {
    const chatContainer = document.getElementById('chat-container');
    
    // Remove "No messages yet" placeholder if it exists
    const noMessagesEl = chatContainer.querySelector('p[style*="No messages yet"]');
    if (noMessagesEl) {
        noMessagesEl.remove();
    }
    
    const div = document.createElement('div');
    div.className = `chat-msg ${isSent ? 'sent' : 'received'}`;
    div.dataset.id = msgId || '';
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

async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const text = chatInput.value.trim();
    if (!text || !currentTicket) return;

    if (currentTicket.status === 'REJECTED' || currentTicket.status === 'COMPLETED') {
        alert('Cannot send messages on rejected or completed deals.');
        return;
    }

    if (containsContactInfo(text)) {
        document.getElementById('chat-warning').style.display = 'block';
        setTimeout(() => { document.getElementById('chat-warning').style.display = 'none'; }, 4000);
        return;
    }

    const btn = document.getElementById('send-msg-btn');
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
        addMessageToChat('You', text, true, new Date().toISOString(), null);

        await createNotification({
            userId: currentTicket.brand_id,
            type: 'message_received',
            message: `💰 You have a new message about your deal`,
            referenceId: currentTicket.id
        });
    }
}

async function submitWork() {
    const url = document.getElementById('submission-url').value.trim();
    const notes = document.getElementById('submission-notes').value.trim();

    if (!url) {
        alert('Please enter the work link (video/post URL)');
        return;
    }

    const btn = document.getElementById('submit-work-btn');
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Submitting...';

    try {
        await insforge.database.from('submissions').insert([{
            ticket_id: currentTicket.id,
            submission_url: url,
            notes: notes || null
        }]);

        await insforge.database.from('ticket_messages').insert([{
            ticket_id: currentTicket.id,
            sender_id: currentUser.id,
            message: `🎬 Work Submitted: ${url}`
        }]);

        await insforge.database
            .from('tickets')
            .update({ status: 'WORK_SUBMITTED' })
            .eq('id', currentTicket.id);

        await createNotification({
            userId: currentTicket.brand_id,
            type: 'work_submitted',
            message: `🎬 Work submitted for your deal. Please review and approve.`,
            referenceId: currentTicket.id
        });

        document.getElementById('submission-url').value = '';
        document.getElementById('submission-notes').value = '';
        
        alert('Work submitted successfully!');
        await loadWorkSubmissions(currentTicket.id);
        
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (messagePollInterval) {
        clearInterval(messagePollInterval);
    }
});

// Payment functions
window.handlePaymentUpload = function(input) {
    if (input.files && input.files[0]) {
        paymentProofFile = input.files[0];
        document.getElementById('payment-upload-name').textContent = paymentProofFile.name;
    }
};

window.updatePaymentFields = async function() {
    const paymentType = document.querySelector('input[name="payment-type"]:checked').value;
    const paymentNumSection = document.getElementById('payment-number-section');
    const paymentNumSelect = document.getElementById('payment-number');
    const amountInput = document.getElementById('payment-amount-input');
    const totalDisplay = document.getElementById('total-amount-display');
    const totalAmount = currentTicket?.final_amount || currentTicket?.proposed_amount || 0;

    if (paymentType === 'partial') {
        paymentNumSection.style.display = 'block';
        
        const { data: existingPayments } = await insforge.database
            .from('payments')
            .select('payment_number, amount')
            .eq('ticket_id', currentTicket.id);
        
        const paidPayments = existingPayments?.map(p => p.payment_number) || [];
        
        Array.from(paymentNumSelect.options).forEach((option) => {
            const pNum = parseInt(option.value);
            option.disabled = paidPayments.includes(pNum);
        });
        
        if (paidPayments.includes(1)) {
            paymentNumSelect.value = '2';
        } else {
            paymentNumSelect.value = '1';
        }
        
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

        await insforge.database
            .from('tickets')
            .update({ status: 'PAYMENT_PROOF_SUBMITTED' })
            .eq('id', currentTicket.id);

        const brand = allBrands[0];
        await createNotification({
            userId: currentTicket.influencer_id,
            type: 'payment_proof',
            message: `📤 ${brand?.brand_name || 'A brand'} uploaded payment proof of ₹${paymentAmount} for your deal`,
            referenceId: currentTicket.id
        });

        paymentProofFile = null;
        document.getElementById('payment-upload-name').textContent = '';
        
        alert('Payment proof submitted successfully!');
        await loadPaymentHistory(currentTicket.id);
        
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Payment Proof';
    }
};