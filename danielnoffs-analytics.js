/*
 * danielnoffs-analytics.js
 * Medição GA4 + consentimento (LGPD) para danielnoffs.com.br (site estático, GitHub Pages)
 *
 * COMO INSTALAR (ainda NÃO instalado, depende de autorização):
 *   1. Salvar este arquivo na raiz do repositório do site.
 *   2. Em index.html e diagnostico.html, colar antes de </body> (depois dos outros scripts):
 *        <script src="/danielnoffs-analytics.js" defer></script>
 *   3. Criar /privacidade.html (link do banner).
 *   4. No GA4 > Fluxo "Meu site" > Métrica otimizada: DESATIVAR "Cliques de saída"
 *      (o link do WhatsApp do diagnóstico leva o nome do visitante na URL; o evento
 *      automático enviaria esse dado pessoal ao GA4). O click_whatsapp abaixo substitui.
 *
 * Modo de consentimento: "básico". Nada do Google é carregado antes de o visitante aceitar.
 * Nenhum dado pessoal (nome, telefone, texto de mensagem, URL com ?text=) é enviado.
 */
(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-WWB9F3145B'; // ID real da propriedade 541425468
  var CONSENT_KEY = 'dn_consent_v1';    // 'granted' | 'denied'

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  var loaded = false;
  function loadGA() {
    if (loaded) return;
    loaded = true;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', MEASUREMENT_ID);
  }

  function getConsent() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {} }

  // Envia evento só se houve consentimento (evita fila crescendo sem uso)
  function track(name, params) {
    if (getConsent() !== 'granted') return;
    gtag('event', name, params || {});
  }
  window.dnTrack = track;

  /* ---------- Banner de consentimento ---------- */
  function showBanner() {
    var b = document.createElement('div');
    b.id = 'dn-consent';
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-label', 'Consentimento de cookies');
    b.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;' +
      'background:#1A1A1A;color:#F5F5F0;border:1px solid #D4A843;border-radius:10px;padding:16px;' +
      'font:14px/1.5 "DM Sans",system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.4)';
    b.innerHTML =
      '<p style="margin:0 0 12px">Usamos cookies de análise (Google Analytics) para entender como o site é usado e melhorar o atendimento. ' +
      'Nenhum dado é coletado antes da sua escolha. <a href="/privacidade.html" style="color:#ffcf05">Política de privacidade</a></p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" data-c="granted" style="background:#ffcf05;color:#252528;border:0;border-radius:6px;padding:10px 16px;font-weight:700;cursor:pointer">Aceitar</button>' +
      '<button type="button" data-c="denied" style="background:transparent;color:#F5F5F0;border:1px solid #F5F5F0;border-radius:6px;padding:10px 16px;cursor:pointer">Recusar</button>' +
      '</div>';
    b.addEventListener('click', function (e) {
      var v = e.target && e.target.getAttribute('data-c');
      if (!v) return;
      setConsent(v);
      b.remove();
      if (v === 'granted') loadGA();
    });
    document.body.appendChild(b);
  }

  /* ---------- Eventos de clique ---------- */
  function pageType() {
    var p = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
    return p || '/';
  }

  function sectionOf(el) {
    var sec = el.parentElement && el.parentElement.closest('section[id], footer, header, [id]');
    if (!sec) return 'page';
    return sec.tagName === 'FOOTER' ? 'footer' : (sec.id || sec.tagName.toLowerCase());
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a, button');
    if (!a) return;
    var href = (a.getAttribute('href') || '').toLowerCase();
    var cls = a.className && a.className.toString ? a.className.toString() : '';
    var rawHref = a.getAttribute('href') || '';
    var page = pageType();

    // WhatsApp (link direto ou botão do resultado do diagnóstico). Sem URL/texto.
    if (href.indexOf('wa.me') > -1 || href.indexOf('whatsapp.com') > -1 || cls.indexOf('btn-wpp') > -1) {
      track('click_whatsapp', {
        link_location: cls.indexOf('btn-wpp-result') > -1 ? 'diagnostico_resultado' : sectionOf(a),
        page_type: page
      });
      return;
    }
    if (href.indexOf('tel:') === 0) { track('click_phone', { link_location: sectionOf(a) }); return; }
    if (href.indexOf('mailto:') === 0) { track('click_email', { link_location: sectionOf(a) }); return; }

    // Produtos digitais (checkout Kiwify). Identifica o produto pelo código do link, nunca dados do comprador.
    if (href.indexOf('pay.kiwify.com.br') > -1) {
      var code = rawHref.split('pay.kiwify.com.br/')[1] || '';
      track('click_product', {
        product_code: code.split(/[?#/]/)[0],
        cta_text: (a.innerText || '').trim().slice(0, 40),
        link_location: sectionOf(a)
      });
      return;
    }
    if (href.indexOf('instagram.com') > -1) { track('click_social', { network: 'instagram', link_location: sectionOf(a) }); return; }

    // CTA principal da home -> diagnóstico
    if (a.id === 'hero-cta' || href.indexOf('diagnostico') > -1) {
      track('click_cta', { cta_id: a.id || 'link_diagnostico', cta_text: (a.innerText || '').trim().slice(0, 40), link_location: sectionOf(a) });
    }
  }, true);

  /* ---------- Funil do diagnóstico (diagnostico.html) ---------- */
  // Usa as funções globais goNext() e showResult() do próprio site, sem alterar o comportamento.
  // Respostas do quiz (sem o nome). "answers" é uma const global do diagnostico.html.
  function quizAnswers() {
    try {
      // eslint-disable-next-line no-undef
      var a = (typeof answers !== 'undefined') ? answers : {};
      return { goal: a.step2 || '(not set)', frequency: a.step3 || '(not set)', experience: a.step4 || '(not set)', modality: a.step5 || '(not set)' };
    } catch (e) { return {}; }
  }

  function hookQuiz() {
    if (typeof window.goNext === 'function' && !window.goNext.__dn) {
      var orig = window.goNext, startedSent = false;
      window.goNext = function (current) {
        var r = orig.apply(this, arguments);
        var n = parseInt(current, 10) || 0;
        if (n === 1 && !startedSent) { startedSent = true; track('quiz_start', { quiz_name: 'diagnostico' }); }
        track('quiz_step', { quiz_name: 'diagnostico', step_number: n });
        return r;
      };
      window.goNext.__dn = true;
    }
    if (typeof window.showResult === 'function' && !window.showResult.__dn) {
      var origR = window.showResult, done = false;
      window.showResult = function () {
        var r = origR.apply(this, arguments);
        if (!done) {
          done = true;
          var p = quizAnswers(); p.quiz_name = 'diagnostico';
          track('quiz_complete', p);
        }
        return r;
      };
      window.showResult.__dn = true;
    }
  }

  /* ---------- Chat flutuante de WhatsApp (index.html) ---------- */
  function hookChat() {
    if (typeof window.toggleChat === 'function' && !window.toggleChat.__dn) {
      var origT = window.toggleChat;
      window.toggleChat = function () {
        var box = document.getElementById('wpp-chat-box');
        var wasOpen = box && box.classList.contains('open');
        var r = origT.apply(this, arguments);
        if (!wasOpen) track('open_chat', { link_location: 'chat_flutuante' });
        return r;
      };
      window.toggleChat.__dn = true;
    }
    if (typeof window.sendWpp === 'function' && !window.sendWpp.__dn) {
      var origS = window.sendWpp;
      window.sendWpp = function () {
        var input = document.getElementById('wpp-msg-input');
        // Só conta se havia mensagem (mesma regra do site). O texto NUNCA é enviado ao GA4.
        if (input && input.value.trim()) track('click_whatsapp', { link_location: 'chat_flutuante', page_type: pageType() });
        return origS.apply(this, arguments);
      };
      window.sendWpp.__dn = true;
    }
  }

  function init() {
    hookQuiz();
    hookChat();
    var c = getConsent();
    if (c === 'granted') loadGA();
    else if (c !== 'denied') showBanner();
  }

  // Permite reabrir a escolha (ex.: link "Preferências de cookies" no rodapé)
  window.dnOpenConsent = function () { try { localStorage.removeItem(CONSENT_KEY); } catch (e) {} showBanner(); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
