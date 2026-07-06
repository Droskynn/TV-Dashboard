/**
 * Service Worker para Dashboard RSS
 */

const CACHE_VERSION = 'v1.0.4';
const CACHE_NAME = `rss-dashboard-${CACHE_VERSION}`;

// Assets para pré-cache (shell da aplicação)
const PRECACHE_ASSETS = [
    './TV.html',
    './manifest.json'
];

// Nome do cache de imagens
const IMAGE_CACHE_NAME = `rss-images-${CACHE_VERSION}`;

// Limite máximo de imagens no cache (evita crescimento infinito)
const MAX_IMAGE_CACHE_ITEMS = 100;

/**
 * Evento de instalação - Pré-cache dos assets essenciais
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pré-cacheando assets essenciais');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                // Ativa imediatamente sem esperar tabs antigas
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Erro no pré-cache:', error);
            })
    );
});

/**
 * Evento de ativação - Limpa caches antigos
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando Service Worker...');
    
    const validCaches = [CACHE_NAME, IMAGE_CACHE_NAME];

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) =>
                            (name.startsWith('rss-dashboard-') ||
                             name.startsWith('rss-images-')) &&
                            !validCaches.includes(name)
                        )
                        .map((name) => {
                            console.log('[SW] Removendo cache antigo:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                // Toma controle de todas as páginas imediatamente
                return self.clients.claim();
            })
    );
});

/**
 * Estratégia: Rede Primeiro com fallback para cache
 * Usada para APIs de dados dinâmicos
 */
async function redePrimeiro(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            // Clona porque response só pode ser consumido uma vez
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Rede falhou, tentando cache:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

/**
 * Estratégia: Cache Primeiro com fallback para rede
 * Usada para assets estáticos
 */
async function cachePrimeiro(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Falha ao buscar:', request.url);
        throw error;
    }
}

/**
 * Estratégia: Cache Primeiro para Imagens com limite de tamanho
 * Cacheia imagens para uso offline, com fallback para rede
 * Inclui limpeza automática quando excede limite
 */
async function cacheImagemPrimeiro(request) {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cacheia apenas imagens válidas (verifica content-type)
            const contentType = networkResponse.headers.get('content-type');
            if (contentType?.startsWith('image/')) {
                // Verifica limite do cache antes de adicionar
                await limitarCacheImagens(cache);
                cache.put(request, networkResponse.clone());
            }
        }
        
        return networkResponse;
    } catch (error) {
        // Retorna resposta vazia transparente para imagens que falharam
        return new Response('', { status: 404, statusText: 'Not Found' });
    }
}

/**
 * Limita o tamanho do cache de imagens removendo itens mais antigos
 */
async function limitarCacheImagens(cache) {
    const keys = await cache.keys();
    
    if (keys.length >= MAX_IMAGE_CACHE_ITEMS) {
        // Remove os 20% mais antigos (FIFO - primeiro a entrar, primeiro a sair)
        const itemsToDelete = Math.ceil(MAX_IMAGE_CACHE_ITEMS * 0.2);
        const keysToDelete = keys.slice(0, itemsToDelete);
        
        await Promise.all(keysToDelete.map(key => cache.delete(key)));
        console.log(`[SW] Cache de imagens: ${itemsToDelete} itens removidos (limite: ${MAX_IMAGE_CACHE_ITEMS})`);
    }
}

/**
 * Evento de fetch - Intercepta todas as requisições
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = request.url;
    
    // Ignora requisições não-GET
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignora chrome-extension e outras URLs especiais
    if (!url.startsWith('http')) {
        return;
    }
    
    // Estratégia baseada no tipo de requisição
    if (request.destination === 'image') {
        // Imagens (thumbnails): Cache Primeiro para performance offline
        event.respondWith(cacheImagemPrimeiro(request));
    } else if (url.includes('.html') || url.includes('.js') || url.includes('.css')) {
        // Assets da aplicação: Cache Primeiro
        event.respondWith(cachePrimeiro(request));
    } else {
        // Outros recursos: Rede Primeiro
        event.respondWith(redePrimeiro(request));
    }
});

console.log('[SW] Service Worker carregado - versão:', CACHE_VERSION);
