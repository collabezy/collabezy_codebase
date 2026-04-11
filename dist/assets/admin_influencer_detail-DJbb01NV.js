import"./style-BMUfA7TY.js";import{o as e,s as t}from"./adminApi-CzFO3A5q.js";var n=new URLSearchParams(window.location.search).get(`id`),r=document.getElementById(`loading`),i=document.getElementById(`content`),a=document.getElementById(`avatar`),o=document.getElementById(`inf-name`),s=document.getElementById(`inf-email`),c=document.getElementById(`inf-categories`),l=document.getElementById(`inf-bio`),u=document.getElementById(`channels-list`);window.addEventListener(`DOMContentLoaded`,async()=>{if(!sessionStorage.getItem(`admin_token`)){window.location.href=`/admin/login.html`;return}if(!n){r.textContent=`No influencer ID provided.`;return}try{let[u,f]=await Promise.all([t(n),e(n)]),p=Array.isArray(u)?u[0]:null,m=Array.isArray(f)?f:[];if(!p){r.textContent=`Influencer profile not found.`;return}o.textContent=p.name||`Anonymous`,s.textContent=p.user_id,l.textContent=p.bio||`No bio available.`,a.src=p.avatar_url||`https://via.placeholder.com/150`,p.category&&Array.isArray(p.category)&&(c.innerHTML=``,p.category.forEach(e=>{let t=document.createElement(`span`);t.className=`pill`,t.textContent=e,c.appendChild(t)})),d(m),r.style.display=`none`,i.style.display=`block`}catch(e){r.textContent=`Error loading profile: `+e.message}});function d(e){if(e.length===0){u.innerHTML=`<p class="subtitle">No social accounts linked.</p>`;return}u.innerHTML=``,e.forEach(e=>{let t=document.createElement(`div`);t.className=`glass-panel`,t.style.padding=`1.5rem`,t.innerHTML=`
            <div class="flex-between mb-4">
                <div>
                   <h3 style="margin-bottom: 0.2rem;">${e.platform.toUpperCase()}</h3>
                   <p class="subtitle" style="font-size: 0.8rem;">${e.channel_name}</p>
                </div>
                <span class="pill" style="border-color: ${e.verified?`#10b981`:`#f59e0b`}; color: ${e.verified?`#10b981`:`#f59e0b`};">
                    ${e.verified?`VERIFIED`:`PENDING`}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; font-size: 0.85rem;">
                <div>
                    <span style="color: var(--text-muted);">Followers:</span><br/>
                    <strong>${e.followers||`0`}</strong>
                </div>
                <div>
                    <span style="color: var(--text-muted);">Avg Views:</span><br/>
                    <strong>${e.avg_views||`0`}</strong>
                </div>
                <div>
                    <span style="color: var(--text-muted);">Engagement:</span><br/>
                    <strong>${e.engagement_rate||0}%</strong>
                </div>
            </div>
        `,u.appendChild(t)})}