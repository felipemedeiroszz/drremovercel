(function(){
  const isIndex = /(?:^|\\\\|\/)index\.html?$/.test(location.pathname) || location.pathname.endsWith('/') || location.pathname === '';
  const routes = [
    { href: 'index.html', label: 'Home' },
    { href: 'sobre.html', label: 'Sobre' },
    { href: 'graduacoes.html', label: 'Graduações' },
    { href: 'servicos.html', label: 'Serviços' },
    { href: 'agendamento.html', label: 'Agendamento' },
    { href: 'contato.html', label: 'Contato' }
  ];

  function navLink(href, label){
    const path = location.pathname.split('/').pop() || 'index.html';
    const active = (path === href) || (isIndex && href === 'index.html');
    return `<li><a class="nav__link ${active? 'active':''}" href="${href}">${label}</a></li>`;
  }

  const header = document.getElementById('site-header');
  if(header){
    header.innerHTML = `
      <div class="container nav nav--centered">
        <div class="nav__left">
          <a class="logo" href="index.html" aria-label="Início">
            <img src="img/logoremo.png" alt="Logo" onerror="this.onerror=null;this.src='assets/img/logo.svg'" />
          </a>
        </div>
        <nav class="nav__center" aria-label="Principal">
          <ul class="nav__list">
            ${routes.map(r=>navLink(r.href, r.label)).join('')}
          </ul>
        </nav>
        <div class="nav__right">
          <a class="patient-link" href="paciente.html">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="vertical-align:middle;">
              <path d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.337 0-8 2.239-8 5v3h16v-3c0-2.761-3.663-5-8-5z" fill="currentColor"/>
            </svg>
            <span style="margin-left:8px;">Área do Paciente</span>
          </a>
          <button class="nav__toggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="mobileMenu">☰</button>
        </div>
      </div>
      <div id="mobileMenu" class="mobile-menu" hidden>
        <ul>
          ${routes.map(r=>navLink(r.href, r.label)).join('')}
          <li>
            <a class="nav__link nav__link--patient" href="paciente.html">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="vertical-align:middle;">
                <path d="M12 12c2.761 0 5-2.686 5-6s-2.239-6-5-6-5 2.686-5 6 2.239 6 5 6zm0 2c-4.337 0-8 2.239-8 5v3h16v-3c0-2.761-3.663-5-8-5z" fill="currentColor"/>
              </svg>
              <span style="margin-left:6px;">Área do Paciente</span>
            </a>
          </li>
        </ul>
      </div>
    `;

    // Lógica do menu hamburguer
    const toggle = header.querySelector('.nav__toggle');
    const mobileMenu = header.querySelector('#mobileMenu');
    const links = mobileMenu.querySelectorAll('a');
    function closeMenu(){
      mobileMenu.hidden = true;
      toggle.setAttribute('aria-expanded','false');
    }
    function openMenu(){
      mobileMenu.hidden = false;
      toggle.setAttribute('aria-expanded','true');
    }
    toggle.addEventListener('click', ()=>{
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      if(isOpen) closeMenu(); else openMenu();
    });
    links.forEach(a=> a.addEventListener('click', closeMenu));
    document.addEventListener('click', (e)=>{
      if(!header.contains(e.target)) closeMenu();
    });
    window.addEventListener('resize', ()=>{
      if(window.innerWidth > 768) closeMenu();
    });

    // (Área do Paciente agora abre em nova página: paciente.html)

    // Nota: A lógica de acesso admin foi movida para a logo do rodapé (ver abaixo)
  }

  const footer = document.getElementById('site-footer');
  if(footer){
    const year = new Date().getFullYear();
    footer.innerHTML = `
      <div class="container">
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="logo" style="width:36px;height:36px;">
            <img src="img/logoremo.png" alt="Logo" onerror="this.onerror=null;this.src='assets/img/logo.svg'" />
          </span>
          <strong>Dr. Remo Jogaib Salciarini</strong>
        </div>
        <small>© 2025 - Urologia minimamente invasiva. CRM:196283-SP / RQE Urologista: 122561 </small>
        <small>Desenvolvido por <a class="credit-link" href="https://www.instagram.com/lfinfo_sjb" target="_blank" rel="noopener">Lfinfo</a></small>
      </div>
    `;

    // Admin: triple-click on footer logo to open password modal
    const footerLogo = footer.querySelector('.logo');
    let clicks = [];
    function resetClicks(){ clicks = []; }
    function isTriple(){
      const now = Date.now();
      clicks = clicks.filter(t=> now - t < 600);
      clicks.push(now);
      return clicks.length >= 3;
    }
    function closeAdminModal(modal){ if(modal && modal.parentNode){ modal.parentNode.removeChild(modal); } }
    function openAdminModal(){
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">
          <h3 id="adminModalTitle" class="modal-title">Acesso Administrativo</h3>
          <p class="modal-desc">Informe a senha para acessar o painel.</p>
          <input id="adminPass" type="password" class="modal-input" placeholder="Senha" />
          <div class="modal-actions">
            <button id="adminCancel" class="btn-ghost">Cancelar</button>
            <button id="adminConfirm" class="btn-primary btn-sm btn-shine">Entrar</button>
          </div>
          <p id="adminError" class="modal-error" hidden>Senha incorreta.</p>
        </div>`;
      document.body.appendChild(modal);
      const input = modal.querySelector('#adminPass');
      const err = modal.querySelector('#adminError');
      setTimeout(()=> input.focus(), 50);
      function onCancel(){ closeAdminModal(modal); }
      function onConfirm(){
        if((input.value||'') === 'remo2025'){
          err.hidden = true;
          closeAdminModal(modal);
          location.href = 'admin.html';
        } else {
          err.hidden = false;
        }
      }
      modal.addEventListener('click', (e)=>{ if(e.target === modal) onCancel(); });
      document.addEventListener('keydown', function onKey(e){ if(e.key==='Escape'){ onCancel(); document.removeEventListener('keydown', onKey); } });
      modal.querySelector('#adminCancel').addEventListener('click', onCancel);
      modal.querySelector('#adminConfirm').addEventListener('click', onConfirm);
    }
    if(footerLogo){
      footerLogo.addEventListener('click', (e)=>{
        // Clique simples não faz nada; só 3 cliques rápidos abrem o modal
        if(isTriple()){
          openAdminModal();
          resetClicks();
        }
      });
    }
  }
})();
