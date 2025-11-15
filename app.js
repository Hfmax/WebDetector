import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Variables globales
let stream = null;
let captionPipeline = null;

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

// Initialiser le modèle d'IA
async function initModel() {
    if (!captionPipeline) {
        showStatus('Chargement du modèle IA (première fois seulement)...', 'loading');
        try {
            // Utilisation du modèle Salesforce BLIP pour la description d'images
            captionPipeline = await pipeline(
                'image-to-text', 
                'Xenova/vit-gpt2-image-captioning'
            );
            showStatus('Modèle chargé avec succès !', 'success');
            setTimeout(hideStatus, 2000);
        } catch (error) {
            showStatus('Erreur lors du chargement du modèle: ' + error.message, 'error');
            console.error(error);
        }
    }
}

// Démarrer la caméra
async function startCamera() {
    try {
        showStatus('Démarrage de la caméra...', 'loading');
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', // Caméra arrière sur mobile
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
            await initModel();
        }
        
        showStatus('Capture de l\'image...', 'loading');
        
        // Configurer le canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Capturer l'image
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Convertir en blob puis en URL
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        // Afficher l'image capturée
        imageContainer.innerHTML = `<img src="${imageDataUrl}" alt="Image capturée">`;
        
        showStatus('Génération de la description...', 'loading');
        
        // Générer la description avec l'IA
        const result = await captionPipeline(imageDataUrl);
        
        // Afficher la description
        const generatedText = result[0].generated_text;
        description.textContent = generatedText.charAt(0).toUpperCase() + generatedText.slice(1);
        descriptionContainer.classList.add('show');
        
        showStatus('Description générée avec succès !', 'success');
        setTimeout(hideStatus, 3000);
        
    } catch (error) {
        showStatus('Erreur lors de la génération: ' + error.message, 'error');
        console.error(error);
    }
}

// Event listeners
startCameraBtn.addEventListener('click', startCamera);
stopCameraBtn.addEventListener('click', stopCamera);
captureBtn.addEventListener('click', captureAndDescribe);

// Nettoyer lors de la fermeture de la page
window.addEventListener('beforeunload', () => {
    stopCamera();
});
