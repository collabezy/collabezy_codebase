import"./style-BMUfA7TY.js";import{i as e,t}from"./adminApi-CzFO3A5q.js";var n=new URLSearchParams(window.location.search).get(`id`),r=document.getElementById(`loading`),i=document.getElementById(`content`),a=document.getElementById(`brand-name`),o=document.getElementById(`brand-email`),s=document.getElementById(`brand-industry`),c=document.getElementById(`brand-website`),l=document.getElementById(`brand-description`),u=document.getElementById(`campaign-list`);window.addEventListener(`DOMContentLoaded`,async()=>{if(!sessionStorage.getItem(`admin_token`)){window.location.href=`/admin/login.html`;return}if(!n){r.textContent=`No brand ID provided.`;return}try{let[u,f]=await Promise.all([t(n),e(n)]),p=Array.isArray(u)?u[0]:null,m=Array.isArray(f)?f:[];if(!p){r.textContent=`Brand profile not found.`;return}a.textContent=p.brand_name||`Anonymous Brand`,o.textContent=p.user_id,s.textContent=p.industry||`Other`,c.href=p.website||`#`,c.textContent=p.website||`No website link provided`,l.textContent=p.description||`No description available.`,d(m),r.style.display=`none`,i.style.display=`block`}catch(e){r.textContent=`Error loading brand: `+e.message}});function d(e){if(e.length===0){u.innerHTML=`<p class="subtitle">No promotion requests found for this brand.</p>`;return}u.innerHTML=``,e.forEach(e=>{let t=document.createElement(`div`);t.className=`glass-panel`,t.style.padding=`1.5rem`,t.innerHTML=`
            <div class="flex-between mb-4">
                <div>
                   <h3 style="margin-bottom: 0.2rem;">${e.product_name}</h3>
                   <span class="pill" style="border-color: #ec4899; color: #ec4899; font-size: 0.65rem;">${e.platform?e.platform.toUpperCase():`N/A`}</span>
                </div>
                <span class="pill" style="border-color: ${e.status===`active`?`#10b981`:`#f59e0b`}; color: ${e.status===`active`?`#10b981`:`#f59e0b`};">
                    ${e.status.toUpperCase()}
                </span>
            </div>
            
            <p class="subtitle mb-4 text-sm" style="font-size: 0.85rem;">${e.description||`No description.`}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                <div>
                    <span style="color: var(--text-muted);">Budget:</span><br/>
                    <strong>${e.budget_min||`N/A`}</strong>
                </div>
                <div>
                    <span style="color: var(--text-muted);">Deadline:</span><br/>
                    <strong>${e.deadline?new Date(e.deadline).toLocaleDateString():`N/A`}</strong>
                </div>
            </div>
        `,u.appendChild(t)})}