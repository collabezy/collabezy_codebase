import"./style-BMUfA7TY.js";import{a as e,c as t,l as n,n as r,r as i}from"./adminApi-CzFO3A5q.js";var a=document.getElementById(`total-influencers`),o=document.getElementById(`total-brands`),s=document.getElementById(`total-campaigns`),c=document.getElementById(`total-tickets`),l=document.getElementById(`influencer-tbody`),u=document.getElementById(`brand-tbody`),d=document.getElementById(`ticket-tbody`),f=document.getElementById(`logout-btn`);window.addEventListener(`DOMContentLoaded`,async()=>{if(!sessionStorage.getItem(`admin_token`)){window.location.href=`/admin/login.html`;return}let e=sessionStorage.getItem(`admin_user`);if(e)JSON.parse(e),document.getElementById(`admin-info`).textContent=`System Admin`;else{sessionStorage.removeItem(`admin_token`),sessionStorage.removeItem(`admin_user`),window.location.href=`/admin/login.html`;return}await p()});async function p(){try{let[l,u,d,f,p]=await Promise.all([t(),e(),r(),i(),n()]),_=l||[],v=d||[];(u||[]).filter(e=>e.verified===!0),a.textContent=_.length,o.textContent=v.length,s.textContent=(f||[]).length,c.textContent=(p||[]).length,m(_,u||[]),h(v,f||[]),g(p||[],v,_,f||[])}catch(e){console.error(`Dashboard error:`,e)}}function m(e,t){l.innerHTML=``,e.forEach(e=>{let n=t.filter(t=>t.user_id===e.user_id),r=n.some(e=>e.verified===!0),i=document.createElement(`tr`);i.innerHTML=`
            <td><strong>${e.name||`Anonymous`}</strong></td>
            <td>${(e.category||[]).join(`, `)||`N/A`}</td>
            <td>${n.length} Accounts</td>
            <td><span class="status-pill ${r?`status-yes`:`status-no`}">${r?`YES`:`NO`}</span></td>
        `,i.onclick=()=>window.location.href=`/admin_influencer_detail.html?id=${e.user_id}`,l.appendChild(i)})}function h(e,t){u.innerHTML=``,e.forEach(e=>{let n=t.filter(t=>t.brand_id===e.user_id),r=document.createElement(`tr`);r.innerHTML=`
            <td><strong>${e.brand_name||`Unknown Brand`}</strong></td>
            <td>${e.email||`N/A`}</td>
            <td>${e.industry||`N/A`}</td>
            <td>${n.length} Campaigns</td>
            <td>${e.created_at?new Date(e.created_at).toLocaleDateString():`N/A`}</td>
        `,r.onclick=()=>window.location.href=`/admin_brand_detail.html?id=${e.user_id}`,u.appendChild(r)})}function g(e,t,n,r){if(d.innerHTML=``,e.length===0){d.innerHTML=`<tr><td colspan="6" style="text-align: center; padding: 2rem;" class="subtitle">No active deals</td></tr>`;return}e.forEach(e=>{let i=t.find(t=>t.user_id===e.brand_id),a=n.find(t=>t.user_id===e.influencer_id),o=r.find(t=>t.id===e.promotion_request_id),s=`status-${e.status?.toLowerCase()||`pending`}`,c=document.createElement(`tr`);c.innerHTML=`
            <td><strong>${i?.brand_name||`Unknown`}</strong></td>
            <td>${a?.name||`Unknown`}</td>
            <td>${o?.product_name||`Direct Deal`}</td>
            <td>₹ ${e.proposed_amount||`0`}</td>
            <td><span class="status-pill ${s}" style="text-transform: uppercase; font-size: 0.7rem;">${e.status||`PENDING`}</span></td>
            <td>${e.created_at?new Date(e.created_at).toLocaleDateString():`N/A`}</td>
        `,d.appendChild(c)})}f.addEventListener(`click`,async e=>{e.preventDefault(),sessionStorage.removeItem(`admin_token`),sessionStorage.removeItem(`admin_user`),window.location.href=`/admin/login.html`});