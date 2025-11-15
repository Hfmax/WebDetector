import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Configuration pour éviter les problèmes de cache
env.allowLocalModels = false;
env.useBrowserCache = true;

// Variables globales
let stream = null;
let captionPipeline = null;
let modelLoading = false;

// Éléments DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const startCameraBtn = document.getElementById('startCamera');
const stopCameraBtn = document.getElementById('stopCamera');
const status = document.getElementById('status');
const imageContainer = document.getElementById('imageContainer');
const description = document.getElementById('description');
const descriptionContainer = document.getElementById('descriptionContainer');

// Afficher un message de statut
function showStatus(message, type = 'loading') {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
}

// Cacher le statut
function hideStatus() {
    status.style.display = 'none';
}

// Initialiser le modèle d'IA avec timeout et indicateur de progression
async function initModel() {
    if (captionPipeline || modelLoading) {
        return; // Déjà chargé ou en cours
    }
    
    modelLoading = true;
    showStatus('⏳ Téléchargement du modèle IA (~40 MB)... Cela peut prendre 30-60 secondes sur mobile.', 'loading');
    
    try {
        // Créer une promesse avec timeout de 2 minutes
        const loadPromise = pipeline(
            'image-to-text', 
            'Xenova/vit-gpt2-image-captioning',
            {
                // Options pour optimiser le chargement
                quantized: true,
                progress_callback: (progress) => {
                    // Afficher la progression du téléchargement
                    if (progress.status === 'downloading') {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        showStatus(`📥 Téléchargement: ${percent}% (${Math.round(progress.loaded / 1024 / 1024)}MB / ${Math.round(progress.total / 1024 / 1024)}MB)`, 'loading');
                    } else if (progress.status === 'loading') {
                        showStatus('⚙️ Chargement du modèle en mémoire...', 'loading');
                    } else if (progress.status === 'ready') {
                        showStatus('✅ Modèle prêt !', 'success');
                    }
                }
            }
        );
        
        // Timeout de 2 minutes (120000 ms)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout: Le chargement du modèle a pris trop de temps')), 120000)
        );
        
        captionPipeline = await Promise.race([loadPromise, timeoutPromise]);
        
        showStatus('✅ Modèle chargé avec succès !', 'success');
        setTimeout(hideStatus, 2000);
        modelLoading = false;
        
    } catch (error) {
        modelLoading = false;
        showStatus('❌ Erreur: ' + error.message + '. Essayez de recharger la page ou vider le cache.', 'error');
        console.error('Erreur détaillée:', error);
        
        // Suggestion de solution
        setTimeout(() => {
            showStatus('💡 Conseil: Assurez-vous d\'avoir une bonne connexion et au moins 500MB de RAM disponible.', 'error');
        }, 3000);
    }
}

// Démarrer la caméra
async function startCamera() {
    try {
        // Vérifier si l'API est disponible
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showStatus('❌ Erreur : L\'accès caméra nécessite HTTPS ou localhost.', 'error');
            return;
        }
        
        showStatus('Démarrage de la caméra...', 'loading');
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        video.srcObject = stream;
        video.style.display = 'block';
        
        captureBtn.disabled = false;
        stopCameraBtn.disabled = false;
        startCameraBtn.disabled = true;
        
        hideStatus();
        
        // Initialiser le modèle en arrière-plan
        initModel();
        
    } catch (error) {
        showStatus('Erreur d\'accès à la caméra: ' + error.message, 'error');
        console.error(error);
    }
}

// Arrêter la caméra
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        video.style.display = 'none';
        stream = null;
        
        captureBtn.disabled = true;
        stopCameraBtn.disabled = true;
        startCameraBtn.disabled = false;
    }
}

// Capturer l'image et générer la description
async function captureAndDescribe() {
    try {
        // S'assurer que le modèle est chargé
        if (!captionPipeline) {
            if (modelLoading) {
                showStatus('⏳ Le modèle est en cours de chargement, veuillez patienter...', 'loading');
                return;
            }
            await initModel();
            if (!captionPipeline) {
                showStatus('❌ Le modèle n\'est pas disponible. Rechargez la page.', 'error');
                return;
            }
        }
        
        showStatus('📸 Capture de l\'image...', 'loading');
        
        // Configurer le canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Capturer l'image
        const ctx = canvas.getContext('2
