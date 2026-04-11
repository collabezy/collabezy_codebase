import"./style-BqVZ4CSq.js";import{a as e,d as t,l as n,n as r,r as i,s as a,u as o}from"./adminApi-CKNIlaRm.js";var s=document.getElementById(`total-influencers`),c=document.getElementById(`total-brands`),l=document.getElementById(`total-campaigns`),u=document.getElementById(`total-tickets`),d=document.getElementById(`influencer-tbody`),f=document.getElementById(`brand-tbody`),p=document.getElementById(`ticket-tbody`),m=document.getElementById(`instagram-verification-tbody`),h=document.getElementById(`logout-btn`);window.addEventListener(`DOMContentLoaded`,async()=>{if(!sessionStorage.getItem(`admin_token`)){window.location.href=`/admin/login.html`;return}let e=sessionStorage.getItem(`admin_user`);if(e)JSON.parse(e),document.getElementById(`admin-info`).textContent=`System Admin`;else{sessionStorage.removeItem(`admin_token`),sessionStorage.removeItem(`admin_user`),window.location.href=`/admin/login.html`;return}await g()});async function g(){try{let[t,d,f,p,m,h]=await Promise.all([n(),e(),r(),i(),o(),a()]),g=t||[],x=f||[];(d||[]).filter(e=>e.verified===!0),s.textContent=g.length,c.textContent=x.length,l.textContent=(p||[]).length,u.textContent=(m||[]).length,v(g,d||[]),y(x,p||[]),b(m||[],x,g,p||[]),_(h||[],t||[])}catch(e){console.error(`Dashboard error:`,e)}}function _(e,t){if(m.innerHTML=``,e.length===0){m.innerHTML=`<tr><td colspan="5" style="text-align: center; padding: 2rem;" class="subtitle">No pending verification requests</td></tr>`;return}e.forEach(e=>{let n=t.find(t=>t.user_id===e.user_id),r=document.createElement(`tr`);r.innerHTML=`
            <td><strong>${n?.name||`Unknown`}</strong></td>
            <td>${e.channel_name||`N/A`}</td>
            <td><a href="${e.channel_url||`#`}" target="_blank" style="color: #ec4899;">${e.channel_url||`N/A`}</a></td>
            <td><code style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.4rem; border-radius: 4px;">${e.verification_code||`N/A`}</code></td>
            <td>
                <button class="btn btn-success btn-sm" onclick="approveInstagram('${e.id}')" style="margin-right: 0.5rem; background: #10b981;">Approve</button>
                <button class="btn btn-danger btn-sm" onclick="rejectInstagram('${e.id}')" style="background: #ef4444;">Reject</button>
            </td>
        `,m.appendChild(r)})}window.approveInstagram=async e=>{if(confirm(`Approve this Instagram channel verification?`))try{await t(e,`approve`),await g(),alert(`Channel approved successfully!`)}catch(e){alert(`Error: `+e.message)}},window.rejectInstagram=async e=>{if(confirm(`Reject this Instagram channel verification?`))try{await t(e,`reject`),await g(),alert(`Channel rejected!`)}catch(e){alert(`Error: `+e.message)}};function v(e,t){d.innerHTML=``,e.forEach(e=>{let n=t.filter(t=>t.user_id===e.user_id),r=n.some(e=>e.verified===!0),i=document.createElement(`tr`);i.innerHTML=`
            <td><strong>${e.name||`Anonymous`}</strong></td>
            <td>${(e.category||[]).join(`, `)||`N/A`}</td>
            <td>${n.length} Accounts</td>
            <td><span class="status-pill ${r?`status-yes`:`status-no`}">${r?`YES`:`NO`}</span></td>
        `,i.onclick=()=>window.location.href=`/admin_influencer_detail.html?id=${e.user_id}`,d.appendChild(i)})}function y(e,t){f.innerHTML=``,e.forEach(e=>{let n=t.filter(t=>t.brand_id===e.user_id),r=document.createElement(`tr`);r.innerHTML=`
            <td><strong>${e.brand_name||`Unknown Brand`}</strong></td>
            <td>${e.email||`N/A`}</td>
            <td>${e.industry||`N/A`}</td>
            <td>${n.length} Campaigns</td>
            <td>${e.created_at?new Date(e.created_at).toLocaleDateString():`N/A`}</td>
        `,r.onclick=()=>window.location.href=`/admin_brand_detail.html?id=${e.user_id}`,f.appendChild(r)})}function b(e,t,n,r){if(p.innerHTML=``,e.length===0){p.innerHTML=`<tr><td colspan="6" style="text-align: center; padding: 2rem;" class="subtitle">No active deals</td></tr>`;return}e.forEach(e=>{let i=t.find(t=>t.user_id===e.brand_id),a=n.find(t=>t.user_id===e.influencer_id),o=r.find(t=>t.id===e.promotion_request_id),s=`status-${e.status?.toLowerCase()||`pending`}`,c=document.createElement(`tr`);c.innerHTML=`
            <td><strong>${i?.brand_name||`Unknown`}</strong></td>
            <td>${a?.name||`Unknown`}</td>
            <td>${o?.product_name||`Direct Deal`}</td>
            <td>₹ ${e.proposed_amount||`0`}</td>
            <td><span class="status-pill ${s}" style="text-transform: uppercase; font-size: 0.7rem;">${e.status||`PENDING`}</span></td>
            <td>${e.created_at?new Date(e.created_at).toLocaleDateString():`N/A`}</td>
        `,p.appendChild(c)})}h.addEventListener(`click`,async e=>{e.preventDefault(),sessionStorage.removeItem(`admin_token`),sessionStorage.removeItem(`admin_user`),window.location.href=`/admin/login.html`});