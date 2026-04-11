import { insforge } from './lib/insforge.js';
import { createNotification, notifyOtherParty } from './notifications.js';

let currentUser = null;
let allTickets = [];
let allBrands = [];
let allPromos = [];
let currentTicket = null;
let messagePollInterval = null;

const dealsContainer = document.getElementById('deals-container');
const ticketModal = document.getElementById('ticket-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const chatInput = document.getElementById('chat-input');
const sendMsgBtn = document.getElementById('send-msg-btn');
const chatWarning = document.getElementById('chat-warning');
const counterAmountInput = document.getElementById('counter-amount');
const submitCounterBtn = document.getElementById('submit-counter-btn');
const cancelCounterBtn = document.getElementById('cancel-counter-btn');

const CONTACT_PATTERNS = [/@/, /\d{10}/, /whatsapp/i, /watsapp/i, /instagram/i, /dm\s*me/i, /contact\s*me/i, /phone/i, /telegram/i, /signal/i, /call\s*me/i];

function containsContactInfo(text) {
    return CONTACT_PATTERNS.some(p => p.test(text));
}

async function getInfluencerNotificationContext(ticket) {
    const brand = allBrands.find(b => b.user_id === ticket.brand_id);
    const promo = allPromos.find(p => p.id === ticket.promotion_request_id);
    
    const { data: influencerProfile } = await insforge.database
        .from('influencer_profiles')
        .select('name')
        .eq('user_id', currentUser.id)
        .single();
    
    return {
        brandName: brand?.brand_name || 'A brand',
        influencerName: influencerProfile?.name || 'You',
        productName: promo?.product_name || 'Direct Deal',
        amount: ticket.proposed_amount || ticket.final_amount || '0'
    };
}

window.addEventListener('DOMContentLoaded', async () => {
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (!authData?.user) {
        window.location.href = '/auth.html';
        return;
    }
    currentUser = authData.user;

    const { data: profile } = await insforge.database
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (profile?.role !== 'INFLUENCER' && currentUser.email !== 'influencerbrandcollaboration@gmail.com') {
        window.location.href = '/brand_dashboard.html';
        return;
    }

    await loadDeals();
});

async function loadDeals() {
    dealsContainer.innerHTML = '<p class="subtitle text-center">Loading deals...</p>';

    const { data: tickets, error: tError } = await insforge.database
        .from('tickets')
        .select('*')
        .eq('influencer_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (tError || !tickets) {
        dealsContainer.innerHTML = '<p class="error">Failed to load deals.</p>';
        return;
    }

    if (tickets.length === 0) {
        dealsContainer.innerHTML = '<p class="subtitle text-center mt-8">No deals yet. Discover brands and they will send you requests!</p>';
        return;
    }

    const brandIds = [...new Set(tickets.map(t => t.brand_id))];
    const { data: brandProfiles } = await insforge.database
        .from('brand_profiles_new')
        .select('*')
        .in('user_id', brandIds);

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
    allBrands = brandProfiles || [];
    allPromos = promoData;

    renderDeals();
}

function renderDeals() {
    console.log('Rendering deals, count:', allTickets.length);
    dealsContainer.innerHTML = '';

    allTickets.forEach(ticket => {
        console.log('Rendering ticket:', ticket.id, ticket.status);
        const brand = allBrands.find(b => b.user_id === ticket.brand_id);
        const promo = allPromos.find(p => p.id === ticket.promotion_request_id);

        const card = document.createElement('div');
        card.className = 'glass-panel deal-card';
        card.onclick = () => window.location.href = `/deal_detail.html?id=${ticket.id}`;

        const statusClass = `status-${ticket.status.toLowerCase()}`;

        card.innerHTML = `
            <div class="deal-info">
                <h3 style="font-size:1.1rem;">${promo ? promo.product_name : 'Direct Deal'}</h3>
                <p class="subtitle" style="font-size:0.85rem;">From: <strong>${brand ? brand.brand_name : 'Unknown Brand'}</strong></p>
                <div class="deal-meta">
                    <span class="status-badge ${statusClass}">${ticket.status.replace(/_/g, ' ')}</span>
                    ${ticket.proposed_amount ? `<span style="font-size:0.85rem;color:#10b981;">₹ ${ticket.proposed_amount}</span>` : ''}
                    <span style="font-size:0.75rem;color:var(--text-muted);">${new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            <button class="btn btn-secondary" style="width:auto;padding:0.5rem 1rem;font-size:0.85rem;">View Details</button>
        `;
        dealsContainer.appendChild(card);
    });
}

async function openTicket(ticketId) {
    console.log('Opening ticket:', ticketId);
    currentTicket = allTickets.find(t => t.id === ticketId);
    if (!currentTicket) {
        console.error('Ticket not found:', ticketId);
        alert('Error: Ticket not found');
        return;
    }
    console.log('Current ticket:', currentTicket);

    const brand = allBrands.find(b => b.user_id === currentTicket.brand_id);
    const promo = allPromos.find(p => p.id === currentTicket.promotion_request_id);

    document.getElementById('detail-product').textContent = promo ? promo.product_name : 'Direct Deal';
    document.getElementById('detail-brand').textContent = brand ? brand.brand_name : 'Unknown Brand';
    document.getElementById('detail-platform').textContent = promo?.platform || 'Not specified';
    document.getElementById('detail-amount').textContent = currentTicket.proposed_amount ? `₹ ${currentTicket.proposed_amount}` : 'Not set';
    
    const deadlineEl = document.getElementById('detail-deadline');
    if (currentTicket.deadline) {
        deadlineEl.textContent = new Date(currentTicket.deadline).toLocaleDateString();
    } else {
        deadlineEl.textContent = 'Not set';
    }

    const statusEl = document.getElementById('detail-status');
    statusEl.textContent = currentTicket.status.replace(/_/g, ' ');
    statusEl.className = `status-badge status-${currentTicket.status.toLowerCase()}`;

    document.getElementById('detail-date').textContent = new Date(currentTicket.created_at).toLocaleDateString();

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

    await loadPaymentProof(ticketId);
    await loadWorkSubmission(ticketId);
    await loadInfluencerPaymentHistory(ticketId);
    renderActionButtons(currentTicket);
    document.getElementById('counter-offer-section').style.display = 'none';
    document.getElementById('work-form-section').style.display = 'none';

    console.log('Showing modal');
    ticketModal.style.display = 'block';
    loadMessages(ticketId);
}

async function loadPaymentProof(ticketId) {
    const section = document.getElementById('payment-proof-section');
    const content = document.getElementById('payment-proof-content');
    
    const { data: payments } = await insforge.database
        .from('payments')
        .select('*')
        .eq('ticket_id', ticketId)
        .single();

    if (payments && payments.proof_url) {
        section.style.display = 'block';
        content.innerHTML = `
            <div class="submission-link">
                <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;">Payment Amount: <strong style="color:#10b981;">₹ ${payments.amount || currentTicket.final_amount}</strong></p>
                <a href="${payments.proof_url}" target="_blank">View Payment Proof Image</a>
            </div>
        `;
    } else {
        section.style.display = 'none';
    }
}

async function loadWorkSubmission(ticketId) {
    const section = document.getElementById('work-submission-section');
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

async function loadInfluencerPaymentHistory(ticketId) {
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
            <p style="font-size: 0.85rem; margin-bottom: 0.5rem;">Total Deal: ₹${totalAmount} | Received: ₹${totalPaid} | Remaining: ₹${remaining}</p>
            <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0}%; background: linear-gradient(90deg, #10b981, #22c55e);"></div>
            </div>
        </div>`;
        
        paymentsHtml += payments.map((p) => {
            const paymentDate = p.created_at ? new Date(p.created_at).toLocaleString() : 'Unknown';
            const paymentTypeLabel = p.payment_type === 'partial' ? `Payment ${p.payment_number} (${p.payment_number === 1 ? 'Before Work' : 'After Work'})` : 'Full Payment';
            return `
                <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-weight: 600;">${paymentTypeLabel}</span>
                        <span style="color: #10b981; font-size: 1.1rem;">₹${p.amount}</span>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">${paymentDate}</p>
                </div>
            `;
        }).join('');
        
        content.innerHTML = paymentsHtml;
    } else {
        section.style.display = 'none';
    }
}

async function renderActionButtons(ticket) {
    const container = document.getElementById('action-buttons');
    container.innerHTML = '';

    switch (ticket.status) {
        case 'PENDING':
            container.innerHTML = `
                <button class="btn btn-primary" onclick="acceptDeal('${ticket.id}')" style="flex:1;">✓ Accept Deal</button>
                <button class="btn btn-secondary" onclick="rejectDeal('${ticket.id}')" style="flex:1;border-color:#ef4444;color:#ef4444;">✕ Reject Deal</button>
                <button class="btn btn-secondary" onclick="showCounterOffer()" style="flex:1;border-color:#6366f1;color:#6366f1;">💰 Counter Offer</button>
            `;
            break;
        case 'NEGOTIATION':
            container.innerHTML = `
                <button class="btn btn-primary" onclick="acceptDeal('${ticket.id}')" style="flex:1;">✓ Accept Offer</button>
                <button class="btn btn-secondary" onclick="rejectDeal('${ticket.id}')" style="flex:1;border-color:#ef4444;color:#ef4444;">✕ Reject</button>
                <button class="btn btn-secondary" onclick="showCounterOffer()" style="flex:1;border-color:#6366f1;color:#6366f1;">💰 Counter Offer</button>
            `;
            break;
        case 'ACCEPTED':
            // Check if payments have been made
            const { data: payments } = await insforge.database
                .from('payments')
                .select('amount, payment_number')
                .eq('ticket_id', ticket.id);
            
            if (payments && payments.length > 0) {
                const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                const totalDeal = parseFloat(ticket.final_amount || ticket.proposed_amount || 0);
                
                if (totalPaid >= totalDeal) {
                    container.innerHTML = `
                        <button class="btn btn-primary" onclick="showWorkForm()" style="flex:1;">📤 Submit Work</button>
                    `;
                } else {
                    const paymentCount = payments.length;
                    container.innerHTML = `<p style="color:#f59e0b;font-weight:bold;margin:0 auto;">✓ Partial Payment ${paymentCount}/2 Received (₹${totalPaid}/${totalDeal})</p>
                    <button class="btn btn-secondary" onclick="showWorkForm()" style="flex:1;margin-top:0.5rem;">📤 Submit Work</button>`;
                }
            } else {
                container.innerHTML = `
                    <p style="color:#10b981;font-weight:bold;margin:0 auto;">✓ Deal Accepted</p>
                    <button class="btn btn-secondary" onclick="showWorkForm()" style="flex:1;margin-top:0.5rem;">📤 Submit Work</button>
                `;
            }
            break;
        case 'REJECTED':
        case 'CANCELLED':
            container.innerHTML = `<p style="color:#ef4444;font-weight:bold;margin:0 auto;">✕ Deal ${ticket.status}</p>`;
            break;
        case 'PAYMENT_PENDING':
            container.innerHTML = `<p style="color:#ec4899;font-weight:bold;margin:0 auto;">⏳ Payment Pending from Brand</p>`;
            break;
        case 'PAYMENT_PROOF_SUBMITTED':
            container.innerHTML = `
                <button class="btn btn-primary" onclick="confirmPaymentReceived('${ticket.id}')" style="flex:1;">✓ Confirm Payment</button>
                <button class="btn btn-secondary" onclick="reportPaymentIssue('${ticket.id}')" style="flex:1;border-color:#f59e0b;color:#f59e0b;">⚠️ Report Issue</button>
            `;
            break;
        case 'PAYMENT_CONFIRMED':
            container.innerHTML = `
                <button class="btn btn-primary" onclick="showWorkForm()" style="flex:1;">📤 Submit Work</button>
            `;
            break;
        case 'WORK_SUBMITTED':
            container.innerHTML = `<p style="color:#a855f7;font-weight:bold;margin:0 auto;">🎬 Work Submitted — Awaiting Brand Review</p>`;
            break;
        case 'CHANGES_REQUESTED':
            container.innerHTML = `
                <button class="btn btn-primary" onclick="showWorkForm()" style="flex:1;">🔄 Resubmit Work</button>
            `;
            break;
        case 'COMPLETED':
            container.innerHTML = `<p style="color:#22c55e;font-weight:bold;margin:0 auto;">🎉 Deal Completed!</p>`;
            break;
        default:
            container.innerHTML = `<p style="color:var(--text-muted);font-weight:bold;margin:0 auto;">${ticket.status}</p>`;
    }
}

window.acceptDeal = async (ticketId) => {
    if (!confirm('Accept this offer? You will be expected to deliver the work.')) return;

    const btn = event.target;
    btn.disabled = true;
    btn.textContent = 'Accepting...';

    const ticket = allTickets.find(t => t.id === ticketId);
    const finalAmount = ticket?.proposed_amount;

    const { error } = await insforge.database
        .from('tickets')
        .update({ 
            status: 'ACCEPTED',
            final_amount: finalAmount
        })
        .eq('id', ticketId);

    if (error) {
        alert('Error: ' + error.message);
        btn.disabled = false;
        btn.textContent = '✓ Accept Deal';
    } else {
        const ctx = await getInfluencerNotificationContext(ticket);
        await createNotification({
            userId: ticket.brand_id,
            type: 'deal_accepted',
            message: `🤝 ${ctx.influencerName} accepted your deal for "${ctx.productName}" at ₹${ctx.amount}. Please proceed with payment.`,
            referenceId: ticketId
        });
        
        await loadDeals();
        currentTicket = allTickets.find(t => t.id === ticketId);
        if (currentTicket) renderActionButtons(currentTicket);
    }
};

window.rejectDeal = async (ticketId) => {
    if (!confirm('Are you sure you want to reject this deal?')) return;

    const btn = event.target;
    btn.disabled = true;
    btn.textContent = 'Rejecting...';

    const ticket = allTickets.find(t => t.id === ticketId);

    const { error } = await insforge.database
        .from('tickets')
        .update({ status: 'REJECTED' })
        .eq('id', ticketId);

    if (error) {
        alert('Error: ' + error.message);
        btn.disabled = false;
        btn.textContent = '✕ Reject Deal';
    } else {
        const ctx = await getInfluencerNotificationContext(ticket);
        await createNotification({
            userId: ticket.brand_id,
            type: 'deal_rejected',
            message: `❌ ${ctx.influencerName} declined your collaboration request for "${ctx.productName}"`,
            referenceId: ticketId
        });

        await loadDeals();
        currentTicket = allTickets.find(t => t.id === ticketId);
        if (currentTicket) renderActionButtons(currentTicket);
    }
};

window.confirmPaymentReceived = async (ticketId) => {
    if (!confirm('Confirm payment has been received? You will proceed to submit your work.')) return;

    const btn = event.target;
    btn.disabled = true;
    btn.textContent = 'Confirming...';

    const ticket = allTickets.find(t => t.id === ticketId);

    // Check how many payments were made
    const { data: payments } = await insforge.database
        .from('payments')
        .select('payment_number, amount')
        .eq('ticket_id', ticketId);

    const totalPayments = payments?.length || 0;
    const totalAmount = parseFloat(ticket.final_amount || ticket.proposed_amount || 0);
    const paidAmount = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

    let newStatus = 'PAYMENT_CONFIRMED';
    let message = '';

    if (totalPayments >= 2) {
        // Both payments done
        newStatus = 'PAYMENT_CONFIRMED';
        message = `✅ ${ctx.influencerName} confirmed full payment of ₹${paidAmount} for "${ctx.productName}". Both payments received!`;
    } else if (totalPayments === 1 && paidAmount < totalAmount) {
        // First partial payment confirmed - still waiting for second
        newStatus = 'PAYMENT_CONFIRMED';
        message = `✅ ${ctx.influencerName} confirmed payment 1 (₹${paidAmount}) for "${ctx.productName}". Waiting for second payment after work completion.`;
    } else {
        message = `✅ ${ctx.influencerName} confirmed payment of ₹${paidAmount} for "${ctx.productName}". They are now ready to submit their work.`;
    }

    const { error } = await insforge.database
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

    if (error) {
        alert('Error: ' + error.message);
        btn.disabled = false;
        btn.textContent = '✓ Confirm Payment';
    } else {
        const ctx = await getInfluencerNotificationContext(ticket);
        await createNotification({
            userId: ticket.brand_id,
            type: 'payment_confirmed',
            message: message,
            referenceId: ticketId
        });

        await loadDeals();
        currentTicket = allTickets.find(t => t.id === ticketId);
        if (currentTicket) renderActionButtons(currentTicket);
    }
};

window.reportPaymentIssue = async (ticketId) => {
    const note = prompt('Describe the payment issue:');
    if (!note) return;

    const ticket = allTickets.find(t => t.id === ticketId);

    await insforge.database
        .from('ticket_messages')
        .insert([{
            ticket_id: ticketId,
            sender_id: currentUser.id,
            message: `⚠️ Payment Issue Reported: ${note}`
        }]);

    const ctx = await getInfluencerNotificationContext(ticket);
    await createNotification({
        userId: ticket.brand_id,
        type: 'payment_issue',
        message: `⚠️ ${ctx.influencerName} reported a payment issue for "${ctx.productName}": ${note}`,
        referenceId: ticketId
    });

    alert('Issue reported. The brand has been notified.');
};

window.showWorkForm = () => {
    document.getElementById('work-form-section').style.display = 'block';
    document.getElementById('submission-url').focus();
};

document.getElementById('submit-work-btn').addEventListener('click', async () => {
    const url = document.getElementById('submission-url').value.trim();
    const notes = document.getElementById('submission-notes').value.trim();

    if (!url) {
        alert('Please enter the work link (video/post URL)');
        return;
    }

    const btn = document.getElementById('submit-work-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
        console.log('Inserting submission for ticket:', currentTicket.id, 'url:', url);
        
        const { error: subError } = await insforge.database
            .from('submissions')
            .insert([{
                ticket_id: currentTicket.id,
                submission_url: url,
                notes: notes || null
            }]);

        console.log('Submission insert result:', subError);
        if (subError) throw subError;

        const { error } = await insforge.database
            .from('tickets')
            .update({ status: 'WORK_SUBMITTED' })
            .eq('id', currentTicket.id);

        if (error) throw error;

        await insforge.database.from('ticket_messages').insert([{
            ticket_id: currentTicket.id,
            sender_id: currentUser.id,
            message: `🎬 Work Submitted: ${url}`
        }]);

        const ctx = await getInfluencerNotificationContext(currentTicket);
        await createNotification({
            userId: currentTicket.brand_id,
            type: 'work_submitted',
            message: `🎬 ${ctx.influencerName} submitted their work for "${ctx.productName}". Please review and approve.`,
            referenceId: currentTicket.id
        });

        document.getElementById('work-form-section').style.display = 'none';
        document.getElementById('submission-url').value = '';
        document.getElementById('submission-notes').value = '';
        
        await loadDeals();
        currentTicket = allTickets.find(t => t.id === currentTicket.id);
        if (currentTicket) renderActionButtons(currentTicket);
        
        loadMessages(currentTicket.id);
        loadWorkSubmission(currentTicket.id);
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

window.showCounterOffer = () => {
    document.getElementById('counter-offer-section').style.display = 'block';
    counterAmountInput.focus();
};

submitCounterBtn.addEventListener('click', async () => {
    const amount = counterAmountInput.value.trim();
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
        counterAmountInput.value = '';
        await loadDeals();
        currentTicket = allTickets.find(t => t.id === currentTicket.id);
        if (currentTicket) renderActionButtons(currentTicket);
        
        await insforge.database.from('ticket_messages').insert([{
            ticket_id: currentTicket.id,
            sender_id: currentUser.id,
            message: `💰 Counter offer sent: ₹${amount}`
        }]);

        const ctx = await getInfluencerNotificationContext(currentTicket);
        await createNotification({
            userId: currentTicket.brand_id,
            type: 'counter_offer',
            message: `💰 ${ctx.influencerName} sent a counter offer of ₹${amount} for "${ctx.productName}"`,
            referenceId: currentTicket.id
        });
        
        loadMessages(currentTicket.id);
    }
});

cancelCounterBtn.addEventListener('click', () => {
    document.getElementById('counter-offer-section').style.display = 'none';
    counterAmountInput.value = '';
});

async function loadMessages(ticketId) {
    console.log('Loading messages for ticket:', ticketId);
    const chatContainer = document.getElementById('chat-container');
    
    // Always show the messaging section for COMPLETED deals too
    const msgSection = chatContainer.closest('.detail-section');
    if (msgSection) {
        msgSection.style.display = 'block';
    }
    
    chatContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;">Loading messages...</p>';

    try {
        const { data: messages, error } = await insforge.database
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        console.log('Messages response:', { messages, error, count: messages?.length });

        if (error) {
            console.error('Error loading messages:', error);
            chatContainer.innerHTML = `<p style="color:#ef4444;font-size:0.85rem;text-align:center;">Error: ${error.message}</p>`;
            return;
        }

        if (!messages || messages.length === 0) {
            chatContainer.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;">No messages yet. Start the conversation!</p>';
        } else {
            chatContainer.innerHTML = '';
            messages.forEach(msg => {
                const isSent = msg.sender_id === currentUser.id;
                const senderName = isSent ? 'You' : 'Brand';
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

sendMsgBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

async function sendMessage() {
    const text = chatInput.value.trim();
    console.log('Send message clicked, text:', text, 'currentTicket:', currentTicket?.id);
    
    if (!text || !currentTicket) {
        console.error('No text or no current ticket');
        return;
    }

    if (currentTicket.status === 'REJECTED') {
        alert('Cannot send messages on rejected deals.');
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

    console.log('Inserting message...');
    const { error } = await insforge.database
        .from('ticket_messages')
        .insert([{
            ticket_id: currentTicket.id,
            sender_id: currentUser.id,
            message: text
        }]);

    console.log('Message insert result:', { error });
    btn.disabled = false;
    btn.textContent = originalText;
    
    if (error) {
        alert('Error sending message: ' + error.message);
    } else {
        chatInput.value = '';
        addMessageToChat('You', text, true);

        const ctx = await getInfluencerNotificationContext(currentTicket);
        await createNotification({
            userId: currentTicket.brand_id,
            type: 'message_received',
            message: `💬 ${ctx.influencerName} sent you a message about "${ctx.productName}"`,
            referenceId: currentTicket.id
        });
    }
}

closeModalBtn.addEventListener('click', () => {
    ticketModal.style.display = 'none';
    if (messagePollInterval) clearInterval(messagePollInterval);
    currentTicket = null;
});

document.getElementById('close-modal-bottom-btn')?.addEventListener('click', () => {
    ticketModal.style.display = 'none';
    if (messagePollInterval) clearInterval(messagePollInterval);
    currentTicket = null;
});

window.addEventListener('click', (e) => {
    if (e.target === ticketModal) {
        ticketModal.style.display = 'none';
        if (messagePollInterval) clearInterval(messagePollInterval);
        currentTicket = null;
    }
});

document.getElementById('logout-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    await insforge.auth.signOut();
    window.location.href = '/index.html';
});