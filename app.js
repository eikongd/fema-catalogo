/* ==========================================================================
   1. CONFIGURACIÓN Y CLIENTE SUPABASE
   ========================================================================== */
const SUPABASE_URL = 'https://jjoibdpsoahybjnwfewz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_a0HQkFV6Cdmdmk4y6qRE-g_5IlBM7RG';
const WHATSAPP_NUMBER = '595982968591';

let joyas = [];
let carrito = [];
let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/* ==========================================================================
   2. FUNCIONES DE UTILIDAD Y COMPLEMENTOS
   ========================================================================== */
function formatGs(n) { 
  return 'Gs. ' + Number(n).toLocaleString('es-PY'); 
}

function escapeHtml(s) { 
  const d = document.createElement('div'); 
  d.textContent = s || ''; 
  return d.innerHTML; 
}

function buildWhatsAppLink(j, colorSeleccionado = '') {
  const detalleColor = colorSeleccionado ? `\n💖 *Color elegido:* ${colorSeleccionado}` : '';
  const mensaje = `¡Hola, FEMA! ✨ Me enamoré de esta hermosa joya y me encantaría saber si la tienen disponible:\n\n` +
                  `🌸 *Producto:* ${j.nombre}${detalleColor}\n` +
                  `✨ *Precio:* ${formatGs(j.precio)}\n\n` +
                  `¡Muchísimas gracias! 💕`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
}

/* ==========================================================================
   3. CONSULTA Y FILTRADO DE DATOS
   ========================================================================== */
async function loadJoyas() {
  if (!supabaseClient) {
    document.getElementById('gridArea').innerHTML = `<div class="setup"><h3>Conectá tu base de datos</h3></div>`;
    return;
  }
  const { data, error } = await supabaseClient.from('joyas').select('*').order('created_at', { ascending: false });
  if (error) {
    document.getElementById('gridArea').innerHTML = `<div class="setup"><h3>Error</h3><p>${error.message}</p></div>`;
    return;
  }
  joyas = data || [];
  render();
}

function getFiltered() {
  const q = document.getElementById('fSearch').value.trim().toLowerCase();
  const cat = document.getElementById('fCategoria').value;
  const mat = document.getElementById('fMaterial').value;
  const pied = document.getElementById('fPiedra').value;
  const orden = document.getElementById('fOrden').value;

  let list = joyas.filter(j => {
    const nombreMatch = j.nombre.toLowerCase().includes(q);
    const descMatch = (j.descripcion || '').toLowerCase().includes(q);
    if (q && !(nombreMatch || descMatch)) return false;
    if (cat && j.categoria !== cat) return false;
    if (mat && j.material !== mat) return false;
    if (pied && j.piedra !== pied) return false;
    return true;
  });

  if (orden === 'precioAsc') list.sort((a, b) => a.precio - b.precio);
  else if (orden === 'precioDesc') list.sort((a, b) => b.precio - a.precio);
  else if (orden === 'nombre') list.sort((a, b) => a.nombre.localeCompare(b.nombre));
  else list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return list;
}

/* ==========================================================================
   4. RENDERIZADO DEL CATÁLOGO Y TARJETAS
   ========================================================================== */
function cardHtml(j) {
  let imgs = Array.isArray(j.imagen) ? j.imagen.filter(Boolean) : (j.imagen ? [j.imagen] : []);
  const firstImg = imgs[0] || '';
  const imgStyle = firstImg ? `style="background-image:url('${firstImg.replace(/'/g, "\\'")}')"` : '';
  
  let thumbsHtml = '';
  if (imgs.length > 1) {
    thumbsHtml = `<div class="thumbs-container">` + 
      imgs.map((img, idx) => `<div class="thumb ${idx === 0 ? 'active' : ''}" style="background-image:url('${img.replace(/'/g, "\\'")}')" onclick="changeActivePhoto(this, '${img.replace(/'/g, "\\'")}', '${j.id}', ${idx})"></div>`).join('') + `</div>`;
  }

  let coloresLista = Array.isArray(j.colores) ? j.colores : [];
  const coloresDisponibles = coloresLista.filter(c => c.disponible !== false);

  let colorsHtml = '';
  let colorInicial = '';
  let precioActual = j.precio;
  let precioAnteriorActual = null;

  if (coloresDisponibles.length > 0) {
    colorInicial = coloresDisponibles[0].nombre;
    precioActual = j.precio; 
    precioAnteriorActual = coloresDisponibles[0].precio_anterior || null;

    colorsHtml = `<div class="color-variants"><span class="color-label">Color:</span>`;
    colorsHtml += coloresDisponibles.map((col, idx) => {
      const imgAsociada = imgs[idx] || firstImg;
      return `<span class="color-badge facet-sm ${idx === 0 ? 'active' : ''}" data-precio="${j.precio}" data-anterior="${col.precio_anterior || ''}" onclick="window.changeActiveColorPro(this, '${escapeHtml(col.nombre)}', '${imgAsociada.replace(/'/g, "\\'")}', '${j.id}', ${idx})">${escapeHtml(col.nombre)}</span>`;
    }).join('') + `</div>`;
  }

  if (coloresLista.length > 0 && coloresDisponibles.length === 0) return ''; 

  let etiquetaHtml = '';
  if (precioAnteriorActual && Number(precioAnteriorActual) > Number(precioActual)) {
    const porcentaje = Math.round(((precioAnteriorActual - precioActual) / precioAnteriorActual) * 100);
    etiquetaHtml = `<div class="destacado" id="tag-descuento-${j.id}" style="background: #A85A70;">${porcentaje}% OFF</div>`;
  } else if (j.destacado) {
    etiquetaHtml = `<div class="destacado" id="tag-descuento-${j.id}">Destacada</div>`;
  } else {
    etiquetaHtml = `<div class="destacado" id="tag-descuento-${j.id}" style="display:none;"></div>`;
  }

  let contenedorPrecio = `
    <div class="price">
      <span class="old-price" style="font-size:14px; text-decoration:line-through; color:var(--texto-suave); margin-right:8px; display:${precioAnteriorActual ? 'inline' : 'none'};">${precioAnteriorActual ? formatGs(precioAnteriorActual) : ''}</span>
      <span class="current-price" style="font-weight: 500;">${formatGs(precioActual)}</span>
    </div>`;

  return `
  <div class="card facet">
    ${etiquetaHtml}
    <div class="img-wrap" id="main-img-${j.id}" data-active-index="0" onclick="openGallery('${j.id}', this.getAttribute('data-active-index'))" ${imgStyle}>${firstImg ? '' : 'Sin imagen'}</div>
    ${thumbsHtml}${colorsHtml}
    <div class="body">
      <div class="cat">${j.categoria}</div>
      <h3>${escapeHtml(j.nombre)}</h3>
      <div class="attrs">
        ${j.material}${j.piedra && j.piedra !== 'Ninguna' ? ' · ' + j.piedra : ''}
        ${j.talla ? '<br>Talla/medida: ' + escapeHtml(j.talla) : ''}
        ${j.peso ? '<br>Peso: ' + j.peso + ' g' : ''}
      </div>
      ${contenedorPrecio}
      <button class="btn-carrito-item" id="btn-cart-${j.id}" onclick="agregarAlCarrito('${j.id}')" data-color="${colorInicial}" data-precio="${precioActual}" style="width: 100%; padding: 10px; margin-bottom: 8px; border: none; border-radius: 8px; background-color: #d4af37; color: white; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 8px;">🛒 Agregar al Carrito</button>
      <a class="comprar" id="btn-direct-${j.id}" href="${buildWhatsAppLink(j, colorInicial)}" target="_blank" rel="noopener" style="margin-top: 0;">Comprar directo</a>
    </div>
  </div>`;
}

function render() {
  const list = getFiltered();
  const area = document.getElementById('gridArea');
  
  document.getElementById('resultCount').textContent =
    joyas.length === 0 ? 'Aún no hay piezas cargadas' : `${list.length} de ${joyas.length} pieza${joyas.length === 1 ? '' : 's'}`;

  if (list.length === 0) {
    area.innerHTML = `<div class="empty"><h3>Sin resultados</h3></div>`;
    return;
  }

  const categoriasAgrupadas = {};
  list.forEach(j => {
    const cat = j.categoria || 'Otros';
    if (!categoriasAgrupadas[cat]) categoriasAgrupadas[cat] = [];
    categoriasAgrupadas[cat].push(j);
  });

  let htmlFinal = '';
  for (const [nombreCategoria, productos] of Object.entries(categoriasAgrupadas)) {
    htmlFinal += `
      <div class="category-row">
        <h3 class="category-title">✨ Colección de ${escapeHtml(nombreCategoria)}</h3>
        <div class="horizontal-scroll-wrapper">
          ${productos.map(cardHtml).join('')}
        </div>
      </div>
    `;
  }
  area.innerHTML = htmlFinal;

  // Activa el desplazamiento con rueda en PC
  activarScrollHorizontalMouse();
}

/* ==========================================================================
   5. INTERACCIONES DE TARJETAS Y GALERÍA (GLOBALES PARA WINDOW)
   ========================================================================== */
window.changeActivePhoto = function(btn, imgUrl, joyaId, index) {
  const card = btn.closest('.card');
  const mainImg = card.querySelector('.img-wrap');
  mainImg.style.backgroundImage = `url('${imgUrl}')`;
  mainImg.setAttribute('data-active-index', index);
  card.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
};

window.changeActiveColorPro = function(btn, colorName, imgUrl, joyaId, index) {
  const badge = btn.closest('.color-badge') || btn;
  if (!badge) return;
  const card = badge.closest('.card');
  if (!card) return;

  card.querySelectorAll('.color-badge').forEach(b => b.classList.remove('active'));
  badge.classList.add('active');

  const nuevoPrecio = Number(badge.getAttribute('data-precio')) || 0;
  const precioAnterior = badge.getAttribute('data-anterior') ? Number(badge.getAttribute('data-anterior')) : null;

  const btnCarrito = card.querySelector('.btn-carrito-item');
  if (btnCarrito) {
    btnCarrito.setAttribute('data-color', colorName);
    btnCarrito.setAttribute('data-precio', nuevoPrecio);
  }

  const btnComprar = card.querySelector('.comprar');
  if (btnComprar) {
    const j = joyas.find(x => x.id.toString() === joyaId.toString());
    if (j) btnComprar.href = buildWhatsAppLink(j, colorName);
  }

  const oldPriceEl = card.querySelector('.old-price');
  const currPriceEl = card.querySelector('.current-price');
  const tagF1 = document.getElementById(`tag-descuento-${joyaId}`);

  if (currPriceEl) currPriceEl.textContent = formatGs(nuevoPrecio);

  if (oldPriceEl) {
    if (precioAnterior && precioAnterior > nuevoPrecio) {
      oldPriceEl.textContent = formatGs(precioAnterior);
      oldPriceEl.style.display = 'inline';
      if (tagF1) {
        const porcentaje = Math.round(((precioAnterior - nuevoPrecio) / precioAnterior) * 100);
        tagF1.textContent = `${porcentaje}% OFF`;
        tagF1.style.display = 'block';
      }
    } else {
      oldPriceEl.style.display = 'none';
      if (tagF1) tagF1.style.display = 'none';
    }
  }
  
  const mainImg = card.querySelector('.img-wrap');
  if (mainImg && imgUrl) {
    mainImg.style.backgroundImage = `url('${imgUrl}')`;
    mainImg.setAttribute('data-active-index', index);
  }
};

window.openGallery = function(joyaId, startIndex = 0) {
  const j = joyas.find(x => x.id.toString() === joyaId.toString());
  if (!j) return;
  let imgs = Array.isArray(j.imagen) ? j.imagen.filter(Boolean) : (j.imagen ? [j.imagen] : []);
  if (imgs.length === 0) return;
  
  const dataSource = imgs.map(url => ({ src: url, w: 0, h: 0 }));
  const lightbox = new window.PhotoSwipeLightbox({
    dataSource: dataSource,
    index: parseInt(startIndex) || 0,
    pswpModule: () => import('https://unpkg.com/photoswipe@5.4.3/dist/photoswipe.esm.js')
  });
  
  lightbox.addFilter('itemData', (itemData, index) => {
    const img = new Image();
    img.src = itemData.src;
    img.onload = () => {
      if (itemData.w === 0) {
        itemData.w = img.naturalWidth || 1200;
        itemData.h = img.naturalHeight || 1200;
        if (lightbox.pswp) lightbox.pswp.refreshSlideContent(index);
      }
    };
    return itemData;
  });
  lightbox.init();
  lightbox.loadAndOpen(parseInt(startIndex) || 0);
};

/* ==========================================================================
   6. GESTIÓN DEL CARRITO DE COMPRAS
   ========================================================================== */
window.agregarAlCarrito = function(joyaId) {
  const j = joyas.find(x => x.id.toString() === joyaId.toString());
  if (!j) return;
  const cardElement = document.getElementById(`main-img-${j.id}`).closest('.card');
  const btnCarrito = cardElement.querySelector('.btn-carrito-item');
  const colorElegido = btnCarrito ? btnCarrito.getAttribute('data-color') : '';
  const precioElegido = btnCarrito ? Number(btnCarrito.getAttribute('data-precio')) : j.precio;

  const itemEnCarrito = carrito.find(x => x.id.toString() === joyaId.toString() && x.color === colorElegido);
  if (itemEnCarrito) {
    itemEnCarrito.cantidad += 1;
  } else {
    let imgs = Array.isArray(j.imagen) ? j.imagen.filter(Boolean) : (j.imagen ? [j.imagen] : []);
    let imagenUrl = imgs[0] || 'https://via.placeholder.com/150';
    carrito.push({ id: j.id, nombre: j.nombre, precio: precioElegido, imagen: imagenUrl, color: colorElegido, cantidad: 1 });
  }
  actualizarContadorCarrito();
  alert(`¡${j.nombre} agregado!`);
};

function actualizarContadorCarrito() {
  const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const badge = document.getElementById('carrito-badge');
  if (badge) {
    badge.innerText = totalItems;
    badge.style.display = totalItems > 0 ? 'block' : 'none';
  }
}

window.mostrarCarrito = function() {
  const offcanvasElement = document.getElementById('offcanvas-carrito');
  const lista = document.getElementById('lista-carrito');
  const totalElen = document.getElementById('total-carrito');
  if (!offcanvasElement || !lista) return;

  lista.innerHTML = '';
  let total = 0;

  if (carrito.length === 0) {
    lista.innerHTML = '<p class="text-center text-muted my-5">Tu carrito está vacío.</p>';
  } else {
    carrito.forEach(item => {
      const subtotal = item.precio * item.cantidad;
      total += subtotal;
      const fila = document.createElement('div');
      fila.className = 'd-flex align-items-center justify-content-between mb-3 pb-3 border-bottom';
      fila.innerHTML = `
        <div class="d-flex align-items-center" style="max-width: 60%;">
          <img src="${item.imagen}" style="width: 50px; height: 50px; object-fit: cover; margin-right: 12px;">
          <div><h6>${item.nombre}</h6><small>${item.color ? 'Color: ' + item.color : ''}</small></div>
        </div>
        <div>
          <button class="btn btn-sm btn-light" onclick="cambiarCantidad('${item.id}', '${item.color}', -1)">-</button>
          <span>${item.cantidad}</span>
          <button class="btn btn-sm btn-light" onclick="cambiarCantidad('${item.id}', '${item.color}', 1)">+</button>
        </div>`;
      lista.appendChild(fila);
    });
  }
  if (totalElen) totalElen.innerText = total.toLocaleString('es-PY') + ' Gs.';
  new bootstrap.Offcanvas(offcanvasElement).show();
};

window.cambiarCantidad = function(id, color, cambio) {
  const item = carrito.find(x => x.id.toString() === id.toString() && x.color === color);
  if (!item) return;
  item.cantidad += cambio;
  if (item.cantidad <= 0) {
    carrito = carrito.filter(x => !(x.id.toString() === id.toString() && x.color === color));
  }
  actualizarContadorCarrito();
  window.mostrarCarrito();
};

window.enviarCarritoWhatsApp = function() {
  if (carrito.length === 0) return;
  const urlBaseWeb = window.location.origin + window.location.pathname;
  let mensaje = `¡Hola, FEMA! ✨ Mi carrito de deseos desde la web:\n\n`;
  let total = 0;
  carrito.forEach((item, index) => {
    total += (item.precio * item.cantidad);
    mensaje += `${index + 1} 🌸 *${item.nombre}* ${item.color ? '(' + item.color + ')' : ''}\n   Cant: ${item.cantidad} x ${formatGs(item.precio)}\n   🔗 ${urlBaseWeb}?id=${item.id}\n\n`;
  });
  mensaje += `💖 *Total:* ${formatGs(total)}`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
};

/* ==========================================================================
   7. SCROLL HORIZONTAL CON LA RUEDA EN PC
   ========================================================================== */
function activarScrollHorizontalMouse() {
  const scrollContainers = document.querySelectorAll('.horizontal-scroll-wrapper');
  scrollContainers.forEach(container => {
    container.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  });
}

/* ==========================================================================
   8. EVENT LISTENERS E INICIALIZACIÓN DE LA PÁGINA
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Filtros
  ['fSearch', 'fCategoria', 'fMaterial', 'fPiedra', 'fOrden'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    }
  });

  const clearBtn = document.getElementById('clearFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('fSearch').value = '';
      document.getElementById('fCategoria').value = '';
      document.getElementById('fMaterial').value = '';
      document.getElementById('fPiedra').value = '';
      document.getElementById('fOrden').value = 'reciente';
      render();
    });
  }

  // Cargar Joyas y evaluar parámetros URL (producto específico)
  loadJoyas().then(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (productId) {
      const joyaEncontrada = joyas.find(j => j.id.toString() === productId.toString());
      if (joyaEncontrada) {
        document.getElementById('gridArea').innerHTML = `
          <div style="margin-bottom:24px;">
            <button onclick="window.location.href=window.location.pathname">✨ Ver todo el catálogo</button>
          </div>
          <div class="grid">${cardHtml(joyaEncontrada)}</div>`;
      }
    }
  });
});
