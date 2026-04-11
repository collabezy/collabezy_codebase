import{t as e}from"./insforge-D28RsFYD.js";import"./style-BqVZ4CSq.js";import{a as t,c as n,i as r,o as i,r as a,s as o}from"./analytics-8ww5WDR9.js";var s=[],c=[],l=null,u=document.getElementById(`influencer-container`),d=document.getElementById(`filter-category`),f=document.getElementById(`filter-platform`),p=document.getElementById(`filter-verified`),m=document.getElementById(`apply-filters-btn`),h=document.getElementById(`logout-btn`);window.addEventListener(`DOMContentLoaded`,async()=>{let{data:t}=await e.auth.getCurrentUser();if(!t?.user){window.location.href=`/brand_auth.html`;return}l=t.user;let{data:n}=await e.database.from(`profiles`).select(`role`).eq(`id`,l.id).single();if(n?.role===`INFLUENCER`&&l.email!==`influencerbrandcollab@gmail.com`){window.location.href=`/index.html`;return}g()});async function g(){u.innerHTML=`<p class="subtitle text-center" style="grid-column: 1/-1;">Loading influencers...</p>`;let{data:t,error:n}=await e.database.from(`influencer_profiles`).select(`*`);if(n){console.error(`Profiles error:`,n),u.innerHTML=`<p class="error">Failed to load influencers.</p>`;return}let{data:r,error:i}=await e.database.from(`social_accounts`).select(`*`);i&&console.error(`Social accounts error:`,i),s=t,c=r||[],_()}function _(){let e=d.value,l=f.value,m=p.checked,h=s.filter(t=>{if(e&&(!t.category||!t.category.some(t=>t.toLowerCase().includes(e.toLowerCase()))))return!1;let n=c.filter(e=>e.user_id===t.user_id);return!(l&&!n.some(e=>e.platform===l)||m&&!n.some(e=>e.verified===!0))});if(h.length===0){u.innerHTML=`<p class="subtitle text-center" style="grid-column: 1/-1;">No influencers found matching these filters.</p>`;return}u.innerHTML=``,h.forEach(e=>{let s=c.filter(t=>t.user_id===e.user_id),l=s.some(e=>e.verified===!0),d=r(s),f=t(s,e),p=n(f),m=a(s),h=o(m),g=document.createElement(`div`);g.className=`glass-panel influencer-card`,g.style.padding=`1.5rem`,g.innerHTML=`
            <div class="flex-between mb-4">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${e.avatar_url||`https://via.placeholder.com/60`}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.1);">
                    <div>
                        <h3 style="font-size: 1.1rem; color: white;">${e.name||`Anonymous Creator`}</h3>
                        <p class="subtitle" style="font-size: 0.85rem;">${(e.category||[]).join(`, `)}</p>
                    </div>
                </div>
                ${l?`<span style="color: #60a5fa; font-size: 1.2rem;">✔️</span>`:``}
            </div>

            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                ${s.filter(e=>e.verified===!0).map(e=>`
                    <span class="stat-badge">${e.platform.toUpperCase()}</span>
                `).join(``)}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                <div class="mini-stat">
                    <span class="mini-stat-label">Followers</span>
                    <span class="mini-stat-value">${i(d)}</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-stat-label">Engagement</span>
                    <span class="mini-stat-value" style="color: ${h.color};">${m===null?`N/A`:m.toFixed(1)+`%`}</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-stat-label">Trust</span>
                    <span class="mini-stat-value" style="color: ${p.color};">${f}/100</span>
                </div>
            </div>

            <p class="subtitle" style="font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.7rem;">
                ${e.bio||`No bio available for this creator.`}
            </p>

            <button class="btn btn-secondary" onclick="window.location.href='/influencer_detail.html?id=${e.user_id}'" style="width: 100%;">View Profile</button>
        `,u.appendChild(g)})}m.addEventListener(`click`,_),h.addEventListener(`click`,async t=>{t.preventDefault(),await e.auth.signOut(),window.location.href=`/index.html`});