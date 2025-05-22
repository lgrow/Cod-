document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired. Script starting...");

    // #############################################################################
    // # --- DOM Element Cache ---
    // #############################################################################
    const DOMElements = {
        appContainer: document.getElementById('app-container'),
        appSidebar: document.getElementById('app-sidebar'),
        mainContent: document.getElementById('main-content'),
        sidebarToggleBtn: document.getElementById('sidebar-toggle-btn'),
        sidebarCloseBtn: document.getElementById('sidebar-close-btn'),
        sidebarOverlay: document.getElementById('sidebar-overlay'),
        sidebarLinks: document.querySelectorAll('.sidebar-link'),
        contentSections: document.querySelectorAll('.main-content .content-section'),
        bubblesBackground: document.getElementById('bubbles-background'), // Still cached if you re-enable

        // --- Settings Elements ---
        apiKeySelect: document.getElementById('gemini-api-key-select'),
        newApiKeyInput: document.getElementById('new-gemini-api-key-input'),
        addApiKeyBtn: document.getElementById('add-gemini-api-key-btn'),
        removeApiKeyBtn: document.getElementById('remove-gemini-api-key-btn'),
        defaultGeminiModelSelect: document.getElementById('default-gemini-model'),
        manualModelNameInput: document.getElementById('manual-model-name-input'),
        addManualModelBtn: document.getElementById('add-manual-model-btn'),
        discoverModelsBtn: document.getElementById('discover-models-btn'),
        availableModelsList: document.getElementById('available-models-list'),
        saveSettingsBtn: document.getElementById('save-settings-btn'),

        // --- Agent Configuration Elements ---
        agentConfigForm: document.getElementById('agent-config-form'),
        agentConfigTitle: document.getElementById('agent-config-heading'),
        agentIdInput: document.getElementById('agent-id'),
        agentNameInput: document.getElementById('agent-name'),
        systemPromptInput: document.getElementById('system-prompt'),
        agentModelSelect: document.getElementById('agent-gemini-model'),
        cancelAgentEditBtn: document.getElementById('cancel-agent-edit-btn'),

        // --- Agent Dashboard Elements ---
        createNewAgentBtn: document.getElementById('create-new-agent-btn'),
        agentListContainer: document.getElementById('agent-list-container'),

        // --- Individual Agent Interaction Elements ---
        backToDashboardBtn: document.getElementById('back-to-dashboard-btn'),
        interactionAgentName: document.getElementById('interaction-agent-name-heading'),
        interactionSystemPrompt: document.getElementById('interaction-system-prompt'),
        chatHistory: document.getElementById('chat-history'),
        userPromptInput: document.getElementById('user-prompt-input'),
        sendPromptBtn: document.getElementById('send-prompt-btn'),

        // --- Workflow Studio Elements ---
        createNewWorkflowBtn: document.getElementById('create-new-workflow-btn'),
        workflowListContainer: document.getElementById('workflow-list-container'),
        workflowEditor: document.getElementById('workflow-editor'),
        workflowEditorTitle: document.getElementById('workflow-editor-title'),
        workflowIdInput: document.getElementById('workflow-id'),
        workflowNameInput: document.getElementById('workflow-name'),
        workflowAgentSelector: document.getElementById('workflow-agent-selector'),
        addAgentToWorkflowBtn: document.getElementById('add-agent-to-workflow-btn'),
        workflowStepsUiContainer: document.querySelector('#workflow-steps-container ul.styled-list'),
        workflowInitialInput: document.getElementById('workflow-initial-input'),
        runWorkflowBtn: document.getElementById('run-workflow-btn'),
        saveWorkflowBtn: document.getElementById('save-workflow-btn'),
        cancelWorkflowEditBtn: document.getElementById('cancel-workflow-edit-btn'),
        workflowOutput: document.getElementById('workflow-output'),

        // --- Master AI Orchestrator Elements ---
        masterAIAgentSelector: document.getElementById('master-ai-agent-selector'),
        highLevelGoalInput: document.getElementById('high-level-goal-input'),
        runMasterAIBtn: document.getElementById('run-master-ai-btn'),
        stopMasterAIBtn: document.getElementById('stop-master-ai-btn'),
        masterAILogArea: document.getElementById('master-ai-log-area'),
        masterAIFinalOutput: document.getElementById('master-ai-final-output'),
        masterAIMaxIterations: document.getElementById('master-ai-max-iterations'),
    };

    // #############################################################################
    // # --- State & Local Storage Keys ---
    // #############################################################################
    const LS_PREFIX = 'geminiStudio_v3_';
    const LSKeys = {
        MANAGED_API_KEYS: `${LS_PREFIX}managedApiKeys`,
        LAST_SELECTED_API_KEY: `${LS_PREFIX}lastSelectedApiKey`,
        GLOBAL_SETTINGS: `${LS_PREFIX}globalSettings`,
        AGENTS: `${LS_PREFIX}agents`,
        WORKFLOWS: `${LS_PREFIX}workflows`,
        SIDEBAR_COLLAPSED: `${LS_PREFIX}sidebarCollapsed`,
    };

    let managedApiKeys = [];
    let globalSettings = { defaultModel: 'gemini-1.5-flash-latest', usableModels: ['gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'] };
    let agents = [];
    let workflows = [];
    let currentEditingAgentId = null, currentInteractingAgentId = null, currentEditingWorkflowId = null;
    let currentWorkflowSteps = [];
    let currentVisibleSection = null, isSidebarTransitioning = false, sectionTransitionTimeout = null;
    let isMasterAiRunning = false, masterAiStopFlag = false;
    let currentMasterAiApiKey = null;
    let currentMasterAiApiKeyIndex = -1;


    // #############################################################################
    // # --- Utility Functions ---
    // #############################################################################
    const generateId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    const getFromLS = (key, defaultValue = null) => {
        const data = localStorage.getItem(key);
        try {
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`Error parsing LS for key "${key}":`, e);
            return defaultValue;
        }
    };
    const saveToLS = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving to LS for key "${key}":`, e);
        }
    };

    // #############################################################################
    // # --- Animation & UI Feedback ---
    // #############################################################################
    function animateElement(element, animationClass, removeAfter = true, durationProperty = '--anim-duration-item') {
        if (!element) return;
        element.classList.add(animationClass);
        if (removeAfter) {
            const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(durationProperty) || '0.3') * 1000;
            setTimeout(() => element.classList.remove(animationClass), duration);
        }
    }
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-enter`;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-visible');
        });
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, duration);
    }

    // #############################################################################
    // # --- Sidebar Management ---
    // #############################################################################
    function applySidebarState(isCollapsed, skipAnimation = false) {
        if (isSidebarTransitioning && !skipAnimation) return;
        if (!skipAnimation) isSidebarTransitioning = true;
        const isMobileView = window.innerWidth <= 992;
        DOMElements.appContainer.classList.toggle('sidebar-collapsed', isCollapsed && !isMobileView);
        DOMElements.appContainer.classList.toggle('sidebar-mobile-opened', !isCollapsed && isMobileView);
        DOMElements.sidebarToggleBtn?.setAttribute('aria-expanded', String(!isCollapsed));
        if (!isMobileView) saveToLS(LSKeys.SIDEBAR_COLLAPSED, isCollapsed);
        if (!skipAnimation) {
            setTimeout(() => { isSidebarTransitioning = false; },
                parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--transition-speed') || '0.35') * 1000
            );
        }
    }
    function toggleSidebar() {
        const isMobileView = window.innerWidth <= 992;
        if (isMobileView) {
            applySidebarState(DOMElements.appContainer.classList.contains('sidebar-mobile-opened'));
        } else {
            applySidebarState(!DOMElements.appContainer.classList.contains('sidebar-collapsed'));
        }
    }
    DOMElements.sidebarToggleBtn?.addEventListener('click', toggleSidebar);
    DOMElements.sidebarCloseBtn?.addEventListener('click', () => applySidebarState(true));
    DOMElements.sidebarOverlay?.addEventListener('click', () => applySidebarState(true));

    function initializeSidebar() {
        const isMobileView = window.innerWidth <= 992;
        const desktopCollapsed = getFromLS(LSKeys.SIDEBAR_COLLAPSED, false) === true;
        applySidebarState(isMobileView || desktopCollapsed, true);
    }
    window.addEventListener('resize', initializeSidebar);

    // #############################################################################
    // # --- Navigation & Section Display ---
    // #############################################################################
    function showSection(sectionId, skipHistory = false) {
        const targetSection = DOMElements.contentSections && DOMElements.contentSections[0] ? document.getElementById(`${sectionId}-section`) : null;
        if (!targetSection) { console.error(`Section "${sectionId}-section" not found or contentSections not available.`); return; }
        if (currentVisibleSection && currentVisibleSection.id === targetSection.id) return;

        const sectionOutDuration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--anim-duration-section-out') || '0.25') * 1000;
        if (sectionTransitionTimeout) clearTimeout(sectionTransitionTimeout);

        DOMElements.contentSections.forEach(s => {
            if (s !== targetSection && s.style.display !== 'none' && s.classList.contains('section-is-visible')) {
                s.classList.remove('section-is-visible');
                s.classList.add('section-is-animating-out');
                setTimeout(() => {
                    if (s.classList.contains('section-is-animating-out')) {
                        s.style.display = 'none';
                        s.classList.remove('section-is-animating-out');
                    }
                }, sectionOutDuration + 50);
            } else if (s !== targetSection) {
                 s.style.display = 'none';
                 s.classList.remove('section-is-visible', 'section-is-animating-out');
            }
        });
        
        if (currentVisibleSection && currentVisibleSection !== targetSection) {
            const oldSection = currentVisibleSection;
            if (oldSection.classList.contains('section-is-visible')) {
                oldSection.classList.remove('section-is-visible');
                oldSection.classList.add('section-is-animating-out');
                sectionTransitionTimeout = setTimeout(() => {
                    if (oldSection.classList.contains('section-is-animating-out')) {
                        oldSection.style.display = 'none';
                        oldSection.classList.remove('section-is-animating-out');
                    }
                }, sectionOutDuration + 50);
            } else {
                oldSection.style.display = 'none';
            }
        }

        targetSection.classList.remove('section-is-animating-out');
        targetSection.style.display = 'block'; 
        requestAnimationFrame(() => { targetSection.classList.add('section-is-visible'); });
        currentVisibleSection = targetSection;

        DOMElements.sidebarLinks.forEach(link => {
            const isActive = link.dataset.section === sectionId;
            link.classList.toggle('active', isActive);
            link.setAttribute('aria-current', isActive ? 'page' : 'false');
        });

        if (window.innerWidth <= 992 && DOMElements.appContainer.classList.contains('sidebar-mobile-opened')) {
            applySidebarState(true); 
        }

        if (DOMElements.workflowEditor) {
            if (sectionId !== 'workflow-studio' && sectionId !== 'workflow-editor') { 
                if (DOMElements.workflowEditor.style.display === 'block') {
                     animateElement(DOMElements.workflowEditor, 'editor-exit-active', false, '--anim-duration-editor');
                     DOMElements.workflowEditor.addEventListener('animationend', () => {
                         DOMElements.workflowEditor.style.display = 'none';
                     }, { once: true });
                }
            }
        }
    }
    DOMElements.sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = e.target.closest('.sidebar-link')?.dataset.section;
            if (sectionId) {
                showSection(sectionId);
            }
        });
    });

    // #############################################################################
    // # --- Placeholder Management ---
    // #############################################################################
    function updatePlaceholderVisibility(listElement, placeholderClass) {
        const placeholder = listElement?.querySelector(`.${placeholderClass}`);
        if (!placeholder || !listElement) return;
        const items = listElement.querySelectorAll('li:not(.list-item-placeholder):not(.placeholder), .card:not(.card-placeholder):not(.placeholder), .workflow-step-item, .chat-message:not(.placeholder), .log-entry:not(.placeholder), p:not(.placeholder)');
        placeholder.style.display = items.length === 0 ? 'block' : 'none';
    }

    // #############################################################################
    // # --- API Key Management (Global Settings) ---
    // #############################################################################
    function renderApiKeysSelect(selectedKey = null) {
        if (!DOMElements.apiKeySelect) return;
        const currentSelected = selectedKey || DOMElements.apiKeySelect.value;
        DOMElements.apiKeySelect.innerHTML = '<option value="">-- Select API Key --</option>';
        managedApiKeys.forEach(key => {
            const option = document.createElement('option');
            const displayKey = key.length > 8 ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : key;
            option.value = key;
            option.textContent = displayKey;
            DOMElements.apiKeySelect.appendChild(option);
        });
        if (currentSelected && managedApiKeys.includes(currentSelected)) {
            DOMElements.apiKeySelect.value = currentSelected;
        } else if (managedApiKeys.length > 0 && DOMElements.apiKeySelect.options.length > 1) { 
             DOMElements.apiKeySelect.selectedIndex = 1; 
             saveLastSelectedApiKey(DOMElements.apiKeySelect.value);
        }
    }
    function saveManagedApiKeysToLS() { saveToLS(LSKeys.MANAGED_API_KEYS, managedApiKeys); }
    function loadManagedApiKeysFromLS() {
        managedApiKeys = getFromLS(LSKeys.MANAGED_API_KEYS, []);
        renderApiKeysSelect(getFromLS(LSKeys.LAST_SELECTED_API_KEY));
    }
    function saveLastSelectedApiKey(key) {
        if (key) saveToLS(LSKeys.LAST_SELECTED_API_KEY, key);
        else localStorage.removeItem(LSKeys.LAST_SELECTED_API_KEY); 
    }
    DOMElements.addApiKeyBtn?.addEventListener('click', () => {
        const newKey = DOMElements.newApiKeyInput.value.trim();
        if (newKey && newKey.length > 10) { 
            if (!managedApiKeys.includes(newKey)) {
                managedApiKeys.push(newKey);
                saveManagedApiKeysToLS();
                renderApiKeysSelect(newKey); 
                saveLastSelectedApiKey(newKey);
                DOMElements.newApiKeyInput.value = '';
                showToast('API Key added!', 'success');
            } else { showToast('This API Key is already saved.', 'warning'); }
        } else { showToast('Please enter a valid API Key (must be longer than 10 characters).', 'error'); }
    });
    DOMElements.removeApiKeyBtn?.addEventListener('click', () => {
        const selectedKey = DOMElements.apiKeySelect.value;
        if (selectedKey) {
            if (confirm(`Are you sure you want to remove the selected API Key (${selectedKey.substring(0, 4)}...)?`)) {
                managedApiKeys = managedApiKeys.filter(key => key !== selectedKey);
                saveManagedApiKeysToLS();
                const lastSelected = getFromLS(LSKeys.LAST_SELECTED_API_KEY);
                if (lastSelected === selectedKey) { saveLastSelectedApiKey(null); renderApiKeysSelect(); } 
                else { renderApiKeysSelect(lastSelected); }
                showToast('API Key removed.', 'info');
            }
        } else { showToast('Please select an API Key to remove.', 'warning'); }
    });
    DOMElements.apiKeySelect?.addEventListener('change', () => { saveLastSelectedApiKey(DOMElements.apiKeySelect.value); });

    // #############################################################################
    // # --- Model Management (Global Settings) ---
    // #############################################################################
    const defaultInitialModels = ['models/gemini-1.5-flash-latest', 'models/gemini-1.5-pro-latest']; 
    function renderUsableModelsList() {
        if (!DOMElements.availableModelsList) return;
        DOMElements.availableModelsList.innerHTML = ''; 
        (globalSettings.usableModels || []).forEach(modelName => {
            const li = document.createElement('li');
            li.className = 'list-item';
            li.dataset.modelName = modelName;
            li.innerHTML = `<span>${modelName}</span><button class="button button-icon remove-model-btn" aria-label="Remove model ${modelName}">×</button>`;
            DOMElements.availableModelsList.appendChild(li);
            animateElement(li, 'item-enter-active');
        });
        updatePlaceholderVisibility(DOMElements.availableModelsList, 'list-item-placeholder');
        populateAllModelSelects(); 
    }
    DOMElements.availableModelsList?.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.remove-model-btn');
        if (removeButton) {
            const listItem = removeButton.closest('.list-item');
            const modelNameToRemove = listItem.dataset.modelName;
            if (confirm(`Remove model: ${modelNameToRemove}?`)) {
                animateElement(listItem, 'item-exit-active', false);
                listItem.addEventListener('animationend', () => {
                    globalSettings.usableModels = (globalSettings.usableModels || []).filter(m => m !== modelNameToRemove);
                    if (globalSettings.defaultModel === modelNameToRemove) { 
                        globalSettings.defaultModel = (globalSettings.usableModels && globalSettings.usableModels.length > 0) ? globalSettings.usableModels[0] : '';
                    }
                    saveGlobalSettingsToLS();
                    renderUsableModelsList(); 
                    showToast('Model removed.', 'info');
                }, { once: true });
            }
        }
    });
    DOMElements.addManualModelBtn?.addEventListener('click', () => {
        const modelName = DOMElements.manualModelNameInput.value.trim();
        if (modelName) {
            if (!(globalSettings.usableModels || []).includes(modelName)) {
                globalSettings.usableModels = [...(globalSettings.usableModels || []), modelName];
                saveGlobalSettingsToLS();
                renderUsableModelsList();
                DOMElements.manualModelNameInput.value = '';
                showToast('Model added.', 'success');
            } else { showToast('Model name already exists.', 'warning'); }
        } else { showToast('Please enter a model name.', 'error'); }
    });
    DOMElements.discoverModelsBtn?.addEventListener('click', () => {
        showToast('Discover Models (Mock): Simulating discovery of default models.', 'info');
        const currentModels = globalSettings.usableModels || [];
        const newModelsDiscovered = defaultInitialModels.filter(dm => !currentModels.includes(dm));
        if (newModelsDiscovered.length > 0) {
            globalSettings.usableModels = [...currentModels, ...newModelsDiscovered];
            saveGlobalSettingsToLS();
            renderUsableModelsList();
            showToast(`${newModelsDiscovered.length} new default models added.`, 'success');
        } else {
            showToast('No new default models to add (already exist or none defined).', 'info');
        }
    });
    function populateAllModelSelects() {
        const models = globalSettings.usableModels || [];
        const defaultModelVal = globalSettings.defaultModel || (models.length > 0 ? models[0] : '');

        const selectors = [ DOMElements.defaultGeminiModelSelect, DOMElements.agentModelSelect ]; 
        selectors.forEach(select => {
            if (!select) return;
            const currentVal = select.value; 
            select.innerHTML = ''; 
            if (models.length === 0) {
                select.innerHTML = '<option value="">No models available</option>'; return;
            }
            models.forEach(modelName => {
                const option = document.createElement('option');
                option.value = modelName; option.textContent = modelName; select.appendChild(option);
            });
            if (models.includes(currentVal)) { select.value = currentVal; } 
            else if (select === DOMElements.defaultGeminiModelSelect && models.includes(defaultModelVal)) { select.value = defaultModelVal; } 
            else if (models.length > 0) { select.value = models[0]; } 
        });
    }
    DOMElements.saveSettingsBtn?.addEventListener('click', () => {
        if (DOMElements.defaultGeminiModelSelect) {
            globalSettings.defaultModel = DOMElements.defaultGeminiModelSelect.value;
            saveGlobalSettingsToLS();
            showToast('Global settings saved!', 'success');
            populateAllModelSelects(); 
        } else {
            console.warn("Default Gemini Model Select element not found. Cannot save settings.");
        }
    });
    function saveGlobalSettingsToLS() { saveToLS(LSKeys.GLOBAL_SETTINGS, globalSettings); }
    function loadGlobalSettingsFromLS() {
        const loadedSettings = getFromLS(LSKeys.GLOBAL_SETTINGS);
        if (loadedSettings) {
            globalSettings = { ...globalSettings, ...loadedSettings }; 
            if (!Array.isArray(globalSettings.usableModels) || globalSettings.usableModels.length === 0) {
                 globalSettings.usableModels = [...defaultInitialModels]; 
            }
        } else {
            globalSettings.usableModels = [...defaultInitialModels];
            globalSettings.defaultModel = (globalSettings.usableModels.length > 0) ? globalSettings.usableModels[0] : '';
        }
    }

    // #############################################################################
    // # --- Gemini API Call Function ---
    // #############################################################################
    async function callGeminiAPI(apiKey, modelName, userPrompt, systemPrompt = null) {
        if (!apiKey) { console.error("callGeminiAPI error: API Key is missing."); throw new Error("API Key is missing or not selected.");}
        if (!modelName) { console.error("callGeminiAPI error: Model name is missing."); throw new Error("Model name is missing."); }
        let finalModelPath = modelName.trim();
        while (finalModelPath.startsWith("models/")) finalModelPath = finalModelPath.substring("models/".length);
        let effectiveModelName;
        if (finalModelPath.includes("gemini-") || finalModelPath.includes("embedding-")) { 
            effectiveModelName = `models/${finalModelPath}`;
        } else { 
            effectiveModelName = finalModelPath; 
            if (!finalModelPath.startsWith("tunedModels/")) {
                console.warn(`Model name "${modelName}" (resolved to "${finalModelPath}") does not follow standard "models/..." or "tunedModels/..." patterns. Using it as is. Ensure this is a valid model identifier for the API.`);
            }
        }
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/${effectiveModelName}:generateContent?key=${apiKey}`;
        try { new URL(API_URL); } catch (urlError) { console.error("Invalid API URL constructed:", API_URL, urlError); throw new Error(`Invalid API URL. Check model configuration. Original error: ${urlError.message}`); }
        const generationConfig = { temperature: 0.7, topP: 0.95, topK: 64, maxOutputTokens: 8192 };
        const payload = { contents: [{ role: "user", parts: [{ text: userPrompt }] }], generationConfig: generationConfig };
        if (systemPrompt && systemPrompt.trim() !== "") { payload.systemInstruction = { parts: [{ text: systemPrompt }] }; }
        console.log("Calling Gemini API. URL:", API_URL, "Original Model:", modelName, "Effective Model:", effectiveModelName, "Key Used:", apiKey.substring(0,4)+"...");
        console.log("Payload (first 500 chars):", JSON.stringify(payload).substring(0,500)+"...");
        let response;
        try {
            response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        } catch (networkError) {
            console.error("Gemini API Network Error:", networkError);
            throw new Error(`Network error while calling Gemini API: ${networkError.message}. Please check your internet connection.`);
        }
        const responseData = await response.json();
        console.log("Gemini API Response Data (first 500 chars):", JSON.stringify(responseData).substring(0,500)+"...");
        if (!response.ok) {
            let errorDetails = `API Error (${response.status}): ${response.statusText}`;
            if (responseData && responseData.error) { errorDetails += ` - ${responseData.error.message || JSON.stringify(responseData.error.details || responseData.error)}`; }
            console.error("Gemini API Error (non-ok response):", errorDetails, responseData);
            throw new Error(errorDetails);
        }
        const candidate = responseData.candidates?.[0];
        if (!candidate) {
            if (responseData.promptFeedback?.blockReason) { throw new Error(`Prompt was blocked by the API. Reason: ${responseData.promptFeedback.blockReason}. Details: ${JSON.stringify(responseData.promptFeedback.safetyRatings)}`); }
            throw new Error("No candidates found in API response.");
        }
        if (candidate.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
            let blockMessage = `Generation stopped due to: ${candidate.finishReason}.`;
            if (candidate.safetyRatings) { console.warn("Safety Ratings:", candidate.safetyRatings); blockMessage += ` Safety Ratings: ${JSON.stringify(candidate.safetyRatings)}`; }
            throw new Error(blockMessage);
        }
        const generatedText = candidate.content?.parts?.[0]?.text;
        if (typeof generatedText === 'string') { return generatedText; } 
        else { throw new Error("Could not extract generated text from API response structure."); }
    }

    // #############################################################################
    // # --- Agent Management ---
    // #############################################################################
    function renderAgentCards() {
        if (!DOMElements.agentListContainer) return;
        DOMElements.agentListContainer.innerHTML = ''; 
        agents.forEach(agent => {
            const card = document.createElement('div');
            card.className = 'card agent-card';
            card.dataset.agentId = agent.id;
            const promptSnippet = agent.systemPrompt && agent.systemPrompt.length > 100 ? agent.systemPrompt.substring(0, 97) + '...' : agent.systemPrompt;
            card.innerHTML = `
                <div class="card-body">
                    <h3 class="card-title">${agent.name} (ID: ${agent.id.substring(agent.id.length-4)})</h3>
                    <p class="card-subtitle">Model: ${agent.model || 'Default (Global Setting)'}</p>
                    <p class="card-text" title="${agent.systemPrompt || ''}">System Prompt: ${agent.systemPrompt ? promptSnippet : '<em>None defined</em>'}</p>
                </div>
                <div class="card-actions">
                    <button class="button button-secondary interact-agent-btn">Interact</button>
                    <button class="button button-secondary edit-agent-btn">Edit</button>
                    <button class="button button-danger delete-agent-btn">Delete</button>
                </div>`;
            DOMElements.agentListContainer.appendChild(card);
            animateElement(card, 'card-enter-active');
        });
        updatePlaceholderVisibility(DOMElements.agentListContainer, 'card-placeholder');
        populateAgentSelectorsForWorkflowAndMaster(); 
    }
    function resetAgentForm() {
        DOMElements.agentConfigForm?.reset();
        if(DOMElements.agentIdInput) DOMElements.agentIdInput.value = ''; 
        currentEditingAgentId = null;
        if (DOMElements.agentConfigTitle) DOMElements.agentConfigTitle.textContent = 'Configure New Agent';
        if (DOMElements.cancelAgentEditBtn) DOMElements.cancelAgentEditBtn.style.display = 'none';
        populateAllModelSelects(); 
        if (DOMElements.agentModelSelect) { 
            DOMElements.agentModelSelect.value = (globalSettings.defaultModel && (globalSettings.usableModels || []).includes(globalSettings.defaultModel))
                ? globalSettings.defaultModel
                : ((globalSettings.usableModels || []).length > 0 ? globalSettings.usableModels[0] : '');
        }
        DOMElements.agentNameInput?.focus();
    }
    DOMElements.createNewAgentBtn?.addEventListener('click', () => {
        resetAgentForm(); showSection('agent-configuration');
    });
    DOMElements.agentConfigForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const agentData = {
            id: DOMElements.agentIdInput.value || generateId(),
            name: DOMElements.agentNameInput.value.trim(),
            systemPrompt: DOMElements.systemPromptInput.value.trim(),
            model: DOMElements.agentModelSelect.value
        };
        if (!agentData.name || !agentData.model) {
            showToast('Agent Name and Model are required.', 'error'); return;
        }
        const isNew = !DOMElements.agentIdInput.value;
        if (isNew) { agents.push(agentData); }
        else {
            const existingIdx = agents.findIndex(a => a.id === agentData.id);
            if (existingIdx > -1) agents[existingIdx] = agentData;
            else agents.push(agentData); 
        }
        saveAgentsToLS(); renderAgentCards(); showSection('agent-dashboard');
        showToast(`Agent "${agentData.name}" ${isNew ? 'created' : 'updated'} successfully!`, 'success');
    });
    DOMElements.cancelAgentEditBtn?.addEventListener('click', () => {
        resetAgentForm(); showSection('agent-dashboard');
    });
    DOMElements.agentListContainer?.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button'); if (!targetButton) return;
        const agentCard = targetButton.closest('.agent-card'); if (!agentCard) return;
        const agentId = agentCard.dataset.agentId;
        const agent = agents.find(a => a.id === agentId); if (!agent) { showToast('Agent not found.', 'error'); return; }

        if (targetButton.classList.contains('edit-agent-btn')) {
            currentEditingAgentId = agent.id;
            DOMElements.agentIdInput.value = agent.id;
            DOMElements.agentNameInput.value = agent.name;
            DOMElements.systemPromptInput.value = agent.systemPrompt;
            populateAllModelSelects(); 
            DOMElements.agentModelSelect.value = agent.model || globalSettings.defaultModel || ((globalSettings.usableModels || [])[0] || ''); 
            if (DOMElements.agentConfigTitle) DOMElements.agentConfigTitle.textContent = `Edit Agent: ${agent.name}`;
            if (DOMElements.cancelAgentEditBtn) DOMElements.cancelAgentEditBtn.style.display = 'inline-block';
            showSection('agent-configuration');
        } else if (targetButton.classList.contains('delete-agent-btn')) {
            if (confirm(`Are you sure you want to delete agent "${agent.name}"? This will also remove it from any workflows.`)) {
                animateElement(agentCard, 'card-exit-active', false);
                agentCard.addEventListener('animationend', () => {
                    agents = agents.filter(a => a.id !== agentId);
                    workflows.forEach(wf => { wf.steps = wf.steps.filter(step => step.agentId !== agentId); });
                    saveAgentsToLS(); saveWorkflowsToLS(); 
                    renderAgentCards(); renderWorkflowCards(); 
                    showToast(`Agent "${agent.name}" deleted.`, 'info');
                }, { once: true });
            }
        } else if (targetButton.classList.contains('interact-agent-btn')) {
            currentInteractingAgentId = agent.id;
            if(DOMElements.interactionAgentName) DOMElements.interactionAgentName.textContent = `Chat with: ${agent.name}`;
            if(DOMElements.interactionSystemPrompt) DOMElements.interactionSystemPrompt.textContent = agent.systemPrompt || "No system prompt defined for this agent.";
            if(DOMElements.chatHistory) DOMElements.chatHistory.innerHTML = ''; 
            addMessageToChat(DOMElements.chatHistory, "system", "Conversation started. Type your message below.");
            DOMElements.userPromptInput.value = ''; 
            showSection('individual-agent-interaction');
            DOMElements.userPromptInput.focus();
        }
    });
    function saveAgentsToLS() { saveToLS(LSKeys.AGENTS, agents); }
    function loadAgentsFromLS() { agents = getFromLS(LSKeys.AGENTS, []); }

    // #############################################################################
    // # --- Individual Agent Interaction ---
    // #############################################################################
    DOMElements.backToDashboardBtn?.addEventListener('click', () => {
        currentInteractingAgentId = null; showSection('agent-dashboard');
    });
    function addMessageToChat(chatElement, sender, text, isThinking = false) {
        if (!chatElement) return;
        let messageClass = '';
        if (sender === 'user') messageClass = 'user-message';
        else if (sender === 'agent') messageClass = 'agent-message';
        else if (sender === 'system') messageClass = 'system-message';
        else if (sender === 'error') messageClass = 'agent-message error-message'; 
        else messageClass = 'generic-message'; 
        if (isThinking) messageClass += ' thinking-message';

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${messageClass}`;
        const p = document.createElement('p');
        p.innerHTML = text; 
        messageDiv.appendChild(p);
        chatElement.appendChild(messageDiv);
        animateElement(messageDiv, 'message-enter-active');
        chatElement.scrollTop = chatElement.scrollHeight; 
        updatePlaceholderVisibility(chatElement, 'chat-placeholder');
        return messageDiv; 
    }
    DOMElements.sendPromptBtn?.addEventListener('click', async () => {
        const promptText = DOMElements.userPromptInput.value.trim();
        const selectedApiKey = DOMElements.apiKeySelect.value; 

        if (!promptText || !currentInteractingAgentId) return;
        if (!selectedApiKey) {
            showToast("API Key not selected. Please select an API Key in Global Settings.", 'error');
            addMessageToChat(DOMElements.chatHistory, 'error', '<strong>Error:</strong> API Key missing. Please configure it in Global Settings.');
            return;
        }

        addMessageToChat(DOMElements.chatHistory, 'user', promptText);
        DOMElements.userPromptInput.value = ''; DOMElements.userPromptInput.focus();

        const agent = agents.find(a => a.id === currentInteractingAgentId);
        if (!agent) {
            addMessageToChat(DOMElements.chatHistory, 'error', '<strong>Error:</strong> Agent configuration not found.');
            return;
        }
        const effectiveModel = agent.model || globalSettings.defaultModel; 
        if (!effectiveModel || !(globalSettings.usableModels || []).includes(effectiveModel)) {
            addMessageToChat(DOMElements.chatHistory, 'error', `<strong>Error:</strong> Model "${effectiveModel}" for this agent is not available or not selected in global settings.`);
            return;
        }

        const thinkingDiv = addMessageToChat(DOMElements.chatHistory, 'agent', '<i class="fas fa-spinner fa-spin"></i> Thinking...', true);
        DOMElements.sendPromptBtn.disabled = true;

        try {
            const responseText = await callGeminiAPI(selectedApiKey, effectiveModel, promptText, agent.systemPrompt);
            if (thinkingDiv) { 
                 animateElement(thinkingDiv, 'message-exit-active', false); 
                 thinkingDiv.addEventListener('animationend', () => thinkingDiv.remove(), {once: true});
            }
            addMessageToChat(DOMElements.chatHistory, 'agent', responseText);
        } catch (error) {
            console.error("Agent Interaction API Error Object:", error);
            if (thinkingDiv) thinkingDiv.remove(); 
            const errorMessage = error.message || 'Failed to fetch or process API response. Check console for details.';
            addMessageToChat(DOMElements.chatHistory, 'error', `<strong>Error:</strong> ${errorMessage}`);
        } finally {
            DOMElements.sendPromptBtn.disabled = false;
        }
    });
    DOMElements.userPromptInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); DOMElements.sendPromptBtn?.click(); }
    });

    // #############################################################################
    // # --- Workflow Management ---
    // #############################################################################
    function populateAgentSelectorsForWorkflowAndMaster() {
        const currentAgents = agents; 
        const selectors = [DOMElements.workflowAgentSelector, DOMElements.masterAIAgentSelector];
        selectors.forEach(select => {
            if (!select) return;
            const currentVal = select.value; 
            select.innerHTML = ''; 
            const defaultOptionText = select === DOMElements.masterAIAgentSelector ? '-- Select Master AI Orchestrator Agent --' : '-- Select Agent for Step --';
            select.innerHTML = `<option value="">${defaultOptionText}</option>`;
            if (currentAgents.length === 0 && select === DOMElements.workflowAgentSelector) { 
                 select.innerHTML = '<option value="">No agents created yet</option>';
            }
            currentAgents.forEach(agent => {
                const option = document.createElement('option');
                option.value = agent.id;
                option.textContent = `${agent.name} (Model: ${agent.model || 'Default'})`;
                select.appendChild(option);
            });
            if (currentAgents.find(a => a.id === currentVal)) { 
                select.value = currentVal;
            }
        });
    }
    function renderWorkflowStepsUI() {
        if (!DOMElements.workflowStepsUiContainer) return;
        DOMElements.workflowStepsUiContainer.innerHTML = ''; 
        currentWorkflowSteps.forEach((step, index) => {
            const agent = agents.find(a => a.id === step.agentId);
            const stepLi = document.createElement('li');
            stepLi.className = 'list-item workflow-step-item'; 
            stepLi.dataset.stepIndex = index; 
            stepLi.innerHTML = `
                <span class="step-number">Step ${index + 1}:</span> 
                <span class="step-agent-name">${agent ? agent.name : 'Unknown Agent (ID: ' + step.agentId + ')'}</span> 
                <button class="button button-icon remove-step-btn" aria-label="Remove step ${index + 1}">×</button>`;
            DOMElements.workflowStepsUiContainer.appendChild(stepLi);
            animateElement(stepLi, 'item-enter-active');
        });
        updatePlaceholderVisibility(DOMElements.workflowStepsUiContainer.closest('div'), 'list-item-placeholder'); 
    }
    DOMElements.addAgentToWorkflowBtn?.addEventListener('click', () => {
        const agentId = DOMElements.workflowAgentSelector.value;
        if (agentId) {
            const agent = agents.find(a => a.id === agentId);
            if (agent) {
                currentWorkflowSteps.push({ agentId: agent.id });
                renderWorkflowStepsUI();
            } else { showToast('Selected agent not found. It might have been deleted.', 'warning'); }
        } else { showToast('Please select an agent to add to the workflow.', 'warning'); }
    });
    DOMElements.workflowStepsUiContainer?.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.remove-step-btn');
        if (removeButton) {
            const stepItem = removeButton.closest('.workflow-step-item');
            const indexToRemove = parseInt(stepItem.dataset.stepIndex);
            animateElement(stepItem, 'item-exit-active', false);
            stepItem.addEventListener('animationend', () => {
                currentWorkflowSteps.splice(indexToRemove, 1);
                renderWorkflowStepsUI(); 
            }, { once: true });
        }
    });
    function resetWorkflowEditorForm() {
        currentEditingWorkflowId = null;
        if(DOMElements.workflowIdInput) DOMElements.workflowIdInput.value = '';
        if(DOMElements.workflowNameInput) DOMElements.workflowNameInput.value = '';
        if(DOMElements.workflowInitialInput) DOMElements.workflowInitialInput.value = '';
        currentWorkflowSteps = [];
        renderWorkflowStepsUI();
        if (DOMElements.workflowOutput) {
            DOMElements.workflowOutput.innerHTML = ''; 
            addMessageToLog(DOMElements.workflowOutput, 'System', 'Workflow output will appear here.', 'output-placeholder');
        }
        if (DOMElements.workflowEditorTitle) DOMElements.workflowEditorTitle.textContent = 'Create New Workflow';
        populateAgentSelectorsForWorkflowAndMaster(); 
        DOMElements.workflowNameInput?.focus();
    }
    function showWorkflowEditor() {
        if (DOMElements.workflowEditor) {
            DOMElements.workflowEditor.style.display = 'block';
            animateElement(DOMElements.workflowEditor, 'editor-enter-active');
            DOMElements.workflowNameInput?.focus();
        }
    }
    function hideWorkflowEditor(callback) {
        if (DOMElements.workflowEditor) {
            animateElement(DOMElements.workflowEditor, 'editor-exit-active', false); 
            const handler = () => {
                DOMElements.workflowEditor.style.display = 'none';
                DOMElements.workflowEditor.removeEventListener('animationend', handler);
                if(callback) callback();
            };
            DOMElements.workflowEditor.addEventListener('animationend', handler, { once: true });
        } else if (callback) { callback(); } 
    }
    DOMElements.createNewWorkflowBtn?.addEventListener('click', () => {
        resetWorkflowEditorForm(); showWorkflowEditor();
    });
    DOMElements.cancelWorkflowEditBtn?.addEventListener('click', () => {
        hideWorkflowEditor(resetWorkflowEditorForm);
    });
    DOMElements.saveWorkflowBtn?.addEventListener('click', () => {
        const wfData = {
            id: DOMElements.workflowIdInput.value || generateId(),
            name: DOMElements.workflowNameInput.value.trim(),
            steps: [...currentWorkflowSteps], 
            initialInput: DOMElements.workflowInitialInput.value.trim()
        };
        if (!wfData.name || wfData.steps.length === 0) {
            showToast('Workflow Name and at least one Step are required.', 'error'); return;
        }
        const isNew = !DOMElements.workflowIdInput.value;
        if (isNew) { workflows.push(wfData); }
        else {
            const existingIdx = workflows.findIndex(w => w.id === wfData.id);
            if (existingIdx > -1) workflows[existingIdx] = wfData; else workflows.push(wfData);
        }
        saveWorkflowsToLS(); renderWorkflowCards(); hideWorkflowEditor(resetWorkflowEditorForm);
        showToast(`Workflow "${wfData.name}" ${isNew ? 'created' : 'updated'}!`, 'success');
    });
    function renderWorkflowCards() {
        if (!DOMElements.workflowListContainer) return;
        DOMElements.workflowListContainer.innerHTML = '';
        workflows.forEach(wf => {
            const card = document.createElement('div');
            card.className = 'card workflow-card'; card.dataset.workflowId = wf.id;
            card.innerHTML = `
                <div class="card-body"><h3 class="card-title">${wf.name}</h3><p class="card-text">${wf.steps.length} step(s)</p></div>
                <div class="card-actions"><button class="button button-secondary edit-workflow-btn">Edit</button><button class="button button-danger delete-workflow-btn">Delete</button></div>`;
            DOMElements.workflowListContainer.appendChild(card);
            animateElement(card, 'card-enter-active');
        });
        updatePlaceholderVisibility(DOMElements.workflowListContainer, 'card-placeholder');
    }
    DOMElements.workflowListContainer?.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button'); if (!targetButton) return;
        const wfCard = targetButton.closest('.workflow-card'); if (!wfCard) return;
        const wfId = wfCard.dataset.workflowId;
        const wf = workflows.find(w => w.id === wfId); if (!wf) { showToast('Workflow not found.', 'error'); return; }

        if (targetButton.classList.contains('edit-workflow-btn')) {
            resetWorkflowEditorForm(); 
            currentEditingWorkflowId = wf.id;
            DOMElements.workflowIdInput.value = wf.id;
            DOMElements.workflowNameInput.value = wf.name;
            DOMElements.workflowInitialInput.value = wf.initialInput || "";
            currentWorkflowSteps = JSON.parse(JSON.stringify(wf.steps)); 
            renderWorkflowStepsUI();
            if (DOMElements.workflowEditorTitle) DOMElements.workflowEditorTitle.textContent = `Edit Workflow: ${wf.name}`;
            showWorkflowEditor();
        } else if (targetButton.classList.contains('delete-workflow-btn')) {
            if (confirm(`Delete workflow "${wf.name}"?`)) {
                animateElement(wfCard, 'card-exit-active', false);
                wfCard.addEventListener('animationend', () => {
                    workflows = workflows.filter(w => w.id !== wfId); saveWorkflowsToLS(); renderWorkflowCards();
                    if (currentEditingWorkflowId === wfId) { hideWorkflowEditor(resetWorkflowEditorForm); }
                    showToast(`Workflow "${wf.name}" deleted.`, 'info');
                }, { once: true });
            }
        }
    });
    function addMessageToLog(logAreaElement, source, text, placeholderClass = 'log-placeholder', allowHTML = false) {
        if (!logAreaElement) return;
        const entry = document.createElement('p'); 
        if (allowHTML) { 
            entry.innerHTML = `<strong>${source}:</strong> ${text}`;
        } else {
            const strong = document.createElement('strong'); strong.textContent = `${source}: `;
            entry.appendChild(strong); entry.appendChild(document.createTextNode(text));
        }
        logAreaElement.appendChild(entry);
        logAreaElement.scrollTop = logAreaElement.scrollHeight;
        updatePlaceholderVisibility(logAreaElement, placeholderClass);
    }
    DOMElements.runWorkflowBtn?.addEventListener('click', async () => {
        const initialData = DOMElements.workflowInitialInput.value.trim();
        const apiKeyToUse = currentMasterAiApiKey || DOMElements.apiKeySelect.value;

        if (currentWorkflowSteps.length === 0) { showToast('No steps in the workflow to run.', 'warning'); return; }
        if (!apiKeyToUse) { 
            showToast('API Key not selected. Please select one in Global Settings.', 'error');
            addMessageToLog(DOMElements.workflowOutput, 'System Error', '<strong>Error:</strong> API Key missing. Please configure it in Global Settings.', 'output-placeholder', true); return;
        }
        if (!initialData && currentWorkflowSteps.length > 0) { 
            showToast('Please provide an initial input for the workflow.', 'warning'); return;
        }

        if (DOMElements.workflowOutput) DOMElements.workflowOutput.innerHTML = ''; 
        addMessageToLog(DOMElements.workflowOutput, 'Workflow', '<i class="fas fa-cog fa-spin"></i> Running workflow...', 'output-placeholder', true);
        let currentData = initialData;
        DOMElements.runWorkflowBtn.disabled = true;

        for (let i = 0; i < currentWorkflowSteps.length; i++) {
            if (masterAiStopFlag && DOMElements.runWorkflowBtn === DOMElements.runMasterAIBtn) { 
                 addMessageToLog(DOMElements.workflowOutput, 'Workflow', 'Stopped by user (Master AI context).', 'output-placeholder'); break;
            }
            const step = currentWorkflowSteps[i]; const agent = agents.find(a => a.id === step.agentId);
            if (!agent) {
                addMessageToLog(DOMElements.workflowOutput, 'Workflow Error', `<strong>Error:</strong> Agent for step ${i + 1} not found. Skipping step.`, 'output-placeholder', true); break; 
            }
            const effectiveModel = agent.model || globalSettings.defaultModel;
            if (!effectiveModel || !(globalSettings.usableModels || []).includes(effectiveModel)) {
                addMessageToLog(DOMElements.workflowOutput, 'Workflow Error', `<strong>Error:</strong> Model '${effectiveModel}' for agent "${agent.name}" (Step ${i+1}) is not available.`, 'output-placeholder', true); break;
            }
            addMessageToLog(DOMElements.workflowOutput, `Step ${i + 1}`, `Running agent "<i>${agent.name}</i>" (Model: ${effectiveModel}). Input (first 100 chars): ${currentData.substring(0,100)}...`, 'output-placeholder', true);
            try {
                await new Promise(r => setTimeout(r, 200)); 
                const stepOutput = await callGeminiAPI(apiKeyToUse, effectiveModel, currentData, agent.systemPrompt);
                addMessageToLog(DOMElements.workflowOutput, `${agent.name} Output`, stepOutput, 'output-placeholder');
                currentData = stepOutput; 
            } catch (error) {
                console.error(`Workflow Step ${i+1} API Error:`, error);
                addMessageToLog(DOMElements.workflowOutput, 'Workflow Error', `<strong>Error in step ${i + 1} (${agent.name}):</strong> ${error.message}`, 'output-placeholder', true); break; 
            }
        }
        addMessageToLog(DOMElements.workflowOutput, 'Workflow', '<strong>Workflow finished.</strong>', 'output-placeholder', true);
        DOMElements.runWorkflowBtn.disabled = false;
    });
    function saveWorkflowsToLS() { saveToLS(LSKeys.WORKFLOWS, workflows); }
    function loadWorkflowsFromLS() { workflows = getFromLS(LSKeys.WORKFLOWS, []); }

    // #############################################################################
    // # --- Master AI Orchestrator ---
    // #############################################################################
    DOMElements.runMasterAIBtn?.addEventListener('click', async () => {
        const masterAgentId = DOMElements.masterAIAgentSelector.value;
        const goal = DOMElements.highLevelGoalInput.value.trim();
        
        currentMasterAiApiKey = DOMElements.apiKeySelect.value; // Initialize with the currently selected key from UI
        if (currentMasterAiApiKey && managedApiKeys.length > 0) {
            currentMasterAiApiKeyIndex = managedApiKeys.indexOf(currentMasterAiApiKey);
            if (currentMasterAiApiKeyIndex === -1 && managedApiKeys.length > 0) { // If selected key not in managed (e.g. just removed but still in select UI temp)
                currentMasterAiApiKeyIndex = 0;
                currentMasterAiApiKey = managedApiKeys[0];
                DOMElements.apiKeySelect.value = currentMasterAiApiKey; // Sync UI select
                saveLastSelectedApiKey(currentMasterAiApiKey);
                 addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Initial API Key was invalid or not found, defaulting to first managed key: ${currentMasterAiApiKey.substring(0,4)}...`, 'log-placeholder');
            }
        } else if (managedApiKeys.length > 0) { // No key selected in UI, but keys are available
            currentMasterAiApiKeyIndex = 0;
            currentMasterAiApiKey = managedApiKeys[0];
            DOMElements.apiKeySelect.value = currentMasterAiApiKey; // Sync UI select
            saveLastSelectedApiKey(currentMasterAiApiKey);
            addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `No API Key selected, defaulting to first managed key: ${currentMasterAiApiKey.substring(0,4)}...`, 'log-placeholder');
        } else { // No keys managed at all
             currentMasterAiApiKey = null;
             currentMasterAiApiKeyIndex = -1;
        }


        if (!currentMasterAiApiKey) { 
            showToast('API Key missing. Please select or add one in Global Settings.', 'error'); 
            addMessageToLog(DOMElements.masterAILogArea, 'System Error', '<strong>Error:</strong> API Key missing or no keys managed.', 'log-placeholder', true); return; 
        }
        
        if (!masterAgentId) { showToast('Master AI Orchestrator Agent not selected.', 'warning'); addMessageToLog(DOMElements.masterAILogArea, 'System Error', '<strong>Error:</strong> Master AI Orchestrator Agent not selected.', 'log-placeholder', true); return; }
        if (!goal) { showToast('High-Level Goal for Master AI is missing.', 'warning'); addMessageToLog(DOMElements.masterAILogArea, 'System Error', '<strong>Error:</strong> High-Level Goal for Master AI is missing.', 'log-placeholder', true); return; }
        const masterAgent = agents.find(a => a.id === masterAgentId);
        if (!masterAgent) { showToast('Master AI Orchestrator Agent configuration not found.', 'error'); addMessageToLog(DOMElements.masterAILogArea, 'System Error', '<strong>Error:</strong> Master AI Orchestrator Agent configuration not found.', 'log-placeholder', true); return; }
        const masterAgentModel = masterAgent.model || globalSettings.defaultModel;
        if (!masterAgentModel || !(globalSettings.usableModels || []).includes(masterAgentModel)) { showToast(`Master AI agent's model "${masterAgentModel}" is not available.`, 'error'); addMessageToLog(DOMElements.masterAILogArea, 'System Error', `<strong>Error:</strong> Master AI agent's model "${masterAgentModel}" is not available.`, 'log-placeholder', true); return; }

        let MAX_ITERATIONS = 30; 
        if (DOMElements.masterAIMaxIterations) {
            const userMaxIterations = parseInt(DOMElements.masterAIMaxIterations.value, 10);
            if (!isNaN(userMaxIterations) && userMaxIterations >= 1 && userMaxIterations <= 50) { MAX_ITERATIONS = userMaxIterations; } 
            else { showToast('Invalid Max Iterations value (must be 1-50). Using default (30).', 'warning'); if (DOMElements.masterAIMaxIterations) DOMElements.masterAIMaxIterations.value = "30"; }
        }
        
        if (DOMElements.masterAILogArea) DOMElements.masterAILogArea.innerHTML = ''; // Clear log area first
        addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Max Iterations set to: ${MAX_ITERATIONS}`, 'log-placeholder');
        addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Using initial API Key: ${currentMasterAiApiKey.substring(0,4)}... (Index: ${currentMasterAiApiKeyIndex})`, 'log-placeholder');


        isMasterAiRunning = true; masterAiStopFlag = false;
        if (DOMElements.masterAIFinalOutput) { DOMElements.masterAIFinalOutput.innerHTML = ''; addMessageToLog(DOMElements.masterAIFinalOutput, 'System', 'Final synthesized output from Master AI will appear here...', 'final-output-placeholder'); }

        addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `<i class="fas fa-brain fa-spin"></i> Starting Master AI Orchestration... Goal: "${goal}"`, 'log-placeholder', true);
        addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Using Master AI: "${masterAgent.name}" (Model: ${masterAgentModel})`, 'log-placeholder');
        DOMElements.runMasterAIBtn.disabled = true; DOMElements.stopMasterAIBtn.style.display = 'inline-block';
        
        let iterationCount = 0;
        let accumulatedResultsHistory = ""; 

        while (iterationCount < MAX_ITERATIONS && !masterAiStopFlag) {
            iterationCount++;

            // --- API Key Rotation Logic ---
            if (iterationCount > 1 && (iterationCount - 1) % 7 === 0) {
                if (managedApiKeys.length > 1) {
                    currentMasterAiApiKeyIndex = (currentMasterAiApiKeyIndex + 1) % managedApiKeys.length; // Cycle through
                    currentMasterAiApiKey = managedApiKeys[currentMasterAiApiKeyIndex];
                    addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `API Key Rotated. Now using: ${currentMasterAiApiKey.substring(0,4)}... (Index: ${currentMasterAiApiKeyIndex})`, 'log-placeholder');
                    showToast(`API Key rotated to: ${currentMasterAiApiKey.substring(0,4)}...`, 'info', 2000);
                } else if (managedApiKeys.length === 1) {
                    addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `API Key Rotation attempt: Only one key available. Sticking to ${currentMasterAiApiKey.substring(0,4)}...`, 'log-placeholder');
                } else { // Should not happen if initial check passed, but as a safeguard
                    addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `API Key Rotation attempt: No managed keys available. This should not happen. Stopping.`, 'log-placeholder');
                    masterAiStopFlag = true;
                    break;
                }
            }
            // --- END API Key Rotation Logic ---

            addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Iteration ${iterationCount}/${MAX_ITERATIONS}: Asking Master AI for the next step... (Using API Key: ${currentMasterAiApiKey.substring(0,4)}...)`, 'log-placeholder');
            
            let contextForMasterAI = `User's High-Level Goal: "${goal}"\n\n`;
            contextForMasterAI += `List of currently available worker agents (you should not call yourself or agents already called if their task is done for this iteration, unless necessary for refinement):\n`;
            agents.forEach(ag => { 
                if (ag.id !== masterAgent.id) { 
                    contextForMasterAI += `- Name: "${ag.name}", ID: "${ag.id}", Description/System Prompt: "${(ag.systemPrompt || 'No specific prompt defined, general purpose.').substring(0, 120)}..." (Model: ${ag.model || globalSettings.defaultModel || 'Default'})\n`;
                }
            });
            contextForMasterAI += `\nAvailable Models for Agent Configuration (if changing an agent's model):\n`;
            (globalSettings.usableModels || []).forEach(model => { contextForMasterAI += `- ${model}\n`; });
            contextForMasterAI += `\nHISTORY OF ACTIONS AND RESULTS SO FAR THIS SESSION (use this to inform your next step and avoid repetition unless necessary):\n${accumulatedResultsHistory || "(No actions taken yet in this session)"}\n\n`;
            contextForMasterAI += `Based on the user's goal, available agents (with their IDs for precise editing), available models, and the history of actions/results, what is the next single, specific action? `;
            contextForMasterAI += `Format your response strictly as ONE of the following:\n`;
            contextForMasterAI += `1. CALL "Agent Name" WITH INPUT {"prompt_text": "Exact input for the agent..."}\n`;
            contextForMasterAI += `2. CREATE NEW AGENT {"name": "Suggested Agent Name", "system_prompt": "Detailed system prompt for the new agent...", "model": "Specify a model from the 'Available Models' list or let the system pick a default if unsure"}\n`;
            contextForMasterAI += `3. EDIT AGENT "Agent ID To Edit" WITH NEW_CONFIG {"name": "Optional New Name", "system_prompt": "Optional New System Prompt", "model": "Optional: Specify a new model from 'Available Models' list, or if not specified and a prompt change suggests a different model type, you can suggest 'AUTO_SELECT_BEST_MODEL_FOR_PROMPT'"}\n   (Provide only the fields you want to change in NEW_CONFIG. Use the Agent ID for accuracy.)\n`;
            contextForMasterAI += `4. TASK COMPLETE. Final Output: [Your final synthesized answer based on all previous steps and results]`;


            try {
                const masterAIResponse = await callGeminiAPI(currentMasterAiApiKey, masterAgentModel, contextForMasterAI, masterAgent.systemPrompt);
                addMessageToLog(DOMElements.masterAILogArea, masterAgent.name, `Suggestion (Iter ${iterationCount}): ${masterAIResponse}`, 'log-placeholder');
                
                let planAction = null, planAgentName = null, planAgentInput = null, newAgentConfig = null, taskCompleteOutput = null;
                let editAgentId = null, editAgentNewConfig = null;

                const callRegex = /CALL\s+"([^"]+)"\s+WITH\s+INPUT\s+({[\s\S]*?})(?:\n|$)/i;
                const createRegex = /CREATE\s+NEW\s+AGENT\s+({[\s\S]*?})(?:\n|$)/i;
                const editRegex = /EDIT\s+AGENT\s+"([^"]+)"\s+WITH\s+NEW_CONFIG\s+({[\s\S]*?})(?:\n|$)/i;
                const taskCompleteMarkerRegex = /TASK\s+COMPLETE\./i; 
                const finalOutputCaptureRegex = /Final\s+Output:\s*([\s\S]*)/i; 

                let match;

                if (taskCompleteMarkerRegex.test(masterAIResponse)) {
                    planAction = "COMPLETE";
                    addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', "Master AI indicated task is complete.");
                    const finalOutputMatch = masterAIResponse.match(finalOutputCaptureRegex);
                    if (finalOutputMatch && finalOutputMatch[1] && finalOutputMatch[1].trim()) { taskCompleteOutput = finalOutputMatch[1].trim(); addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', "Explicit 'Final Output:' content found.", 'log-placeholder'); } 
                    else { const fallbackOutputMatch = masterAIResponse.match(/TASK\s+COMPLETE\.\s*([\s\S]*)/i); if (fallbackOutputMatch && fallbackOutputMatch[1] && fallbackOutputMatch[1].trim()) { taskCompleteOutput = fallbackOutputMatch[1].trim(); addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', "Using content after 'TASK COMPLETE.' as final output.", 'log-placeholder'); } 
                           else { taskCompleteOutput = "Task is marked complete by Master AI, but no specific output was provided after 'Final Output:'."; addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', "No clear 'Final Output:' or subsequent content.", 'log-placeholder'); }
                    }
                    if (DOMElements.masterAIFinalOutput) {
                        DOMElements.masterAIFinalOutput.innerHTML = ''; 
                        if (taskCompleteOutput.includes('\n* ') || taskCompleteOutput.startsWith('* ')) { let htmlOutput = ''; const lines = taskCompleteOutput.split('\n'); let inList = false; lines.forEach(line => { line = line.trim(); if (line.startsWith('* ')) { if (!inList) { htmlOutput += '<ul>'; inList = true; } htmlOutput += `<li>${line.substring(2).trim()}</li>`; } else { if (inList) { htmlOutput += '</ul>'; inList = false; } if (line.length > 0) htmlOutput += `<p>${line}</p>`; } }); if (inList) htmlOutput += '</ul>'; addMessageToLog(DOMElements.masterAIFinalOutput, 'Master AI', htmlOutput, 'final-output-placeholder', true); } 
                        else { addMessageToLog(DOMElements.masterAIFinalOutput, 'Master AI', taskCompleteOutput, 'final-output-placeholder'); }
                    }
                    masterAiStopFlag = true; 
                } else {
                    match = masterAIResponse.match(callRegex);
                    if (match) {
                        planAction = "CALL"; planAgentName = match[1].trim();
                        try { const parsedInput = JSON.parse(match[2]); planAgentInput = parsedInput.prompt_text || match[2]; } 
                        catch (e) { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Warning: Parsing CALL input JSON failed: ${e.message}. Using raw string: ${match[2]}`, 'log-placeholder'); planAgentInput = match[2]; }
                    } else {
                        match = masterAIResponse.match(createRegex);
                        if (match) {
                            planAction = "CREATE";
                            try { newAgentConfig = JSON.parse(match[1]); }
                            catch (e) { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Error parsing CREATE NEW AGENT JSON: ${e.message}. Raw: ${match[1]}`, 'log-placeholder'); newAgentConfig = null; }
                        } else {
                            match = masterAIResponse.match(editRegex);
                            if (match) {
                                planAction = "EDIT";
                                editAgentId = match[1].trim();
                                try { editAgentNewConfig = JSON.parse(match[2]); }
                                catch (e) { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Error parsing EDIT AGENT NEW_CONFIG JSON: ${e.message}. Raw: ${match[2]}`, 'log-placeholder'); editAgentNewConfig = null; }
                            }
                        }
                    }
                }
                
                if (masterAiStopFlag) break; 

                if (planAction === "CALL" && planAgentName && planAgentInput) {
                    const workerAgent = agents.find(a => a.name.toLowerCase() === planAgentName.toLowerCase());
                    if (workerAgent) {
                        const workerModel = workerAgent.model || globalSettings.defaultModel;
                        if (!workerModel || !(globalSettings.usableModels || []).includes(workerModel)) { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Error: Worker agent "${workerAgent.name}" model "${workerModel}" is not available. Skipping call.`, 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Attempted to call ${workerAgent.name} but its model ${workerModel} was invalid or unavailable.\n`; } 
                        else {
                            addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Calling agent "${workerAgent.name}" (Model: ${workerModel}) with input (first 100 chars): ${String(planAgentInput).substring(0,100)}...`, 'log-placeholder');
                            const workerResponse = await callGeminiAPI(currentMasterAiApiKey, workerModel, planAgentInput, workerAgent.systemPrompt);
                            addMessageToLog(DOMElements.masterAILogArea, workerAgent.name, `Output: ${workerResponse}`, 'log-placeholder');
                            accumulatedResultsHistory += `Step ${iterationCount}: Called agent "${workerAgent.name}". Input: "${String(planAgentInput).substring(0, 50)}...". Output: "${workerResponse.substring(0, 100)}..."\n`;
                        }
                    } else { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Error: Agent "${planAgentName}" suggested by Master AI was not found. Suggestion: Master AI should CREATE it if needed or check spelling.`, 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Attempted to call non-existent agent "${planAgentName}".\n`; }
                } else if (planAction === "CREATE" && newAgentConfig) {
                    addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Master AI suggests CREATE AGENT: ${JSON.stringify(newAgentConfig)}`, 'log-placeholder');
                    if (newAgentConfig.name && newAgentConfig.system_prompt && newAgentConfig.model) {
                        if (agents.find(a => a.name.toLowerCase() === newAgentConfig.name.toLowerCase())) { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Agent with name "${newAgentConfig.name}" already exists. Not creating. Master AI should check existing agents first.`, 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Master AI suggested creating agent "${newAgentConfig.name}", but it already exists.\n`; } 
                        else {
                            const newAgent = { id: generateId(), name: newAgentConfig.name, systemPrompt: newAgentConfig.system_prompt, model: (globalSettings.usableModels || []).includes(newAgentConfig.model) ? newAgentConfig.model : (globalSettings.defaultModel || (globalSettings.usableModels || [])[0] || 'gemini-1.5-flash-latest') };
                            agents.push(newAgent); saveAgentsToLS(); renderAgentCards(); populateAgentSelectorsForWorkflowAndMaster(); 
                            addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `SUCCESS: Agent "${newAgent.name}" created and saved by Master AI's request! It is now available for subsequent calls.`, 'log-placeholder');
                            accumulatedResultsHistory += `Step ${iterationCount}: Successfully created new agent "${newAgent.name}" as per Master AI. It is now available.\n`;
                        }
                    } else { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', "CREATE AGENT command from Master AI was missing required fields (name, system_prompt, model). Cannot create agent.", 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Master AI's CREATE AGENT command was malformed or incomplete.\n`; }
                } 
                else if (planAction === "EDIT" && editAgentId && editAgentNewConfig) {
                    addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Master AI suggests EDIT AGENT (ID: "${editAgentId}") with NEW_CONFIG: ${JSON.stringify(editAgentNewConfig)}`, 'log-placeholder');
                    const agentIndex = agents.findIndex(a => a.id === editAgentId);
                    if (agentIndex > -1) {
                        let changed = false;
                        const originalAgent = { ...agents[agentIndex] }; 

                        if (editAgentNewConfig.name && typeof editAgentNewConfig.name === 'string' && agents[agentIndex].name !== editAgentNewConfig.name.trim()) { agents[agentIndex].name = editAgentNewConfig.name.trim(); changed = true; }
                        if (editAgentNewConfig.system_prompt && typeof editAgentNewConfig.system_prompt === 'string' && agents[agentIndex].systemPrompt !== editAgentNewConfig.system_prompt.trim()) { agents[agentIndex].systemPrompt = editAgentNewConfig.system_prompt.trim(); changed = true; }
                        
                        let newModel = agents[agentIndex].model; 
                        if (editAgentNewConfig.model && typeof editAgentNewConfig.model === 'string') {
                            const suggestedModel = editAgentNewConfig.model.trim();
                            if (suggestedModel.toUpperCase() === "AUTO_SELECT_BEST_MODEL_FOR_PROMPT") {
                                if (agents[agentIndex].systemPrompt !== originalAgent.systemPrompt) { newModel = globalSettings.defaultModel || (globalSettings.usableModels.length > 0 ? globalSettings.usableModels[0] : agents[agentIndex].model); addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `AUTO_SELECT_BEST_MODEL triggered for agent ${editAgentId}. New prompt detected. Switched to default model: ${newModel}`, 'log-placeholder'); } 
                                else { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `AUTO_SELECT_BEST_MODEL triggered for agent ${editAgentId}, but prompt unchanged. Keeping model: ${newModel}`, 'log-placeholder'); }
                            } else if ((globalSettings.usableModels || []).includes(suggestedModel)) { newModel = suggestedModel; } 
                            else { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Warning: Suggested model "${suggestedModel}" for edit is not in usable models list. Model will not be changed from "${newModel}".`, 'log-placeholder'); }
                        }
                        if (agents[agentIndex].model !== newModel) { agents[agentIndex].model = newModel; changed = true; }
                        
                        if (changed) {
                            saveAgentsToLS(); renderAgentCards(); populateAgentSelectorsForWorkflowAndMaster();
                            addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `SUCCESS: Agent "${agents[agentIndex].name}" (ID: ${editAgentId}) updated by Master AI's request! New Model: ${agents[agentIndex].model}`, 'log-placeholder');
                            accumulatedResultsHistory += `Step ${iterationCount}: Successfully edited agent "${agents[agentIndex].name}" (ID: ${editAgentId}). New model: ${agents[agentIndex].model}.\n`;
                        } else {
                            addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Agent (ID: ${editAgentId}) found, but no valid changes provided in NEW_CONFIG or new values matched existing. No update performed. Current model: ${agents[agentIndex].model}`, 'log-placeholder');
                             accumulatedResultsHistory += `Step ${iterationCount}: Attempted to edit agent (ID: ${editAgentId}) but no changes were applied.\n`;
                        }
                    } else { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Error: Agent with ID "${editAgentId}" for EDIT AGENT command not found.`, 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Master AI attempted to edit non-existent agent with ID "${editAgentId}".\n`; }
                }
                else if (!planAction && !masterAiStopFlag) { 
                    addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', "Master AI did not provide a clear CALL, CREATE, EDIT, or TASK COMPLETE instruction. Master AI response needs to be more precise. Trying to continue, or stopping if max iterations reached. Response was: " + masterAIResponse.substring(0,200) + "...", 'log-placeholder');
                    accumulatedResultsHistory += `Step ${iterationCount}: Master AI response was unclear or did not match expected format: ${masterAIResponse.substring(0, 100)}...\n`;
                }
            } catch (error) {
                console.error("Master AI Orchestration Error:", error);
                addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator Error', `<strong>Critical Error during Master AI step ${iterationCount}:</strong> ${error.message}`, 'log-placeholder', true); 
                masterAiStopFlag = true; 
            }

            if (iterationCount >= MAX_ITERATIONS && !masterAiStopFlag) {
                addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', `Max iterations (${MAX_ITERATIONS}) reached. Stopping orchestration.`, 'log-placeholder');
                if (DOMElements.masterAIFinalOutput && DOMElements.masterAIFinalOutput.querySelector('.final-output-placeholder')) { 
                    DOMElements.masterAIFinalOutput.innerHTML = ''; 
                    addMessageToLog(DOMElements.masterAIFinalOutput, 'System', 'Orchestration stopped due to reaching maximum iterations before a "TASK COMPLETE" signal from Master AI.', 'final-output-placeholder');
                }
                masterAiStopFlag = true;
            }
            await new Promise(r => setTimeout(r, 500)); 
        } 

        if (masterAiStopFlag && !DOMElements.masterAILogArea.innerText.includes("TASK COMPLETE") && !DOMElements.masterAILogArea.innerText.includes("Stopped by user")) { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', "Orchestration stopped (likely due to error or max iterations).", 'log-placeholder'); if (DOMElements.masterAIFinalOutput && DOMElements.masterAIFinalOutput.querySelector('.final-output-placeholder')) { DOMElements.masterAIFinalOutput.innerHTML = ''; addMessageToLog(DOMElements.masterAIFinalOutput, 'System', 'Orchestration stopped before a final output was explicitly generated by Master AI.', 'final-output-placeholder'); } } 
        else if (!DOMElements.masterAILogArea.innerText.includes("TASK COMPLETE") && !DOMElements.masterAILogArea.innerText.includes("stopped")) { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', "Orchestration finished (max iterations reached without explicit completion).", 'log-placeholder'); if (DOMElements.masterAIFinalOutput && DOMElements.masterAIFinalOutput.querySelector('.final-output-placeholder')) { DOMElements.masterAIFinalOutput.innerHTML = ''; addMessageToLog(DOMElements.masterAIFinalOutput, 'System', 'Orchestration finished, but no explicit "TASK COMPLETE" with final output was issued by Master AI within the iteration limit.', 'final-output-placeholder'); } } 
        else if (DOMElements.masterAILogArea.innerText.includes("TASK COMPLETE")) { addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', "Orchestration successfully completed by Master AI.", 'log-placeholder'); }

        isMasterAiRunning = false; 
        DOMElements.runMasterAIBtn.disabled = false; 
        DOMElements.stopMasterAIBtn.style.display = 'none';
        currentMasterAiApiKey = null; 
        currentMasterAiApiKeyIndex = -1; 
    });

    DOMElements.stopMasterAIBtn?.addEventListener('click', () => {
        if (isMasterAiRunning) {
            masterAiStopFlag = true;
            addMessageToLog(DOMElements.masterAILogArea, 'Orchestrator', "<strong>Stop signal received. Attempting to halt orchestration gracefully after current step...</strong>", 'log-placeholder', true);
        } else { 
            DOMElements.stopMasterAIBtn.style.display = 'none'; 
        }
    });

    // #############################################################################
    // # --- Data Persistence (Loaders) ---
    // #############################################################################
    function loadDataFromLS() {
        loadManagedApiKeysFromLS();
        loadGlobalSettingsFromLS();
        loadAgentsFromLS();
        loadWorkflowsFromLS();
    }

    // #############################################################################
    // # --- Bubble Creation (REMOVED FROM INITIALIZATION) ---
    // #############################################################################
    function startBubbleMachine(numBubblesInitial = 15, continuousInterval = 0) {
        // This function is no longer called automatically but is kept if you want to re-enable it.
        if (!DOMElements.bubblesBackground) return;
        const bubbleColors = [ 
            'var(--grad-color-1-alpha, rgba(230, 230, 250, 0.5))', 
            'var(--grad-color-2-alpha, rgba(255, 218, 185, 0.5))', 
            'var(--grad-color-3-alpha, rgba(173, 216, 230, 0.5))', 
            'var(--grad-color-4-alpha, rgba(175, 238, 238, 0.5))', 
            'var(--grad-color-5-alpha, rgba(255, 240, 245, 0.5))' 
        ];
        function createSingleBubble() {
            if (!DOMElements.bubblesBackground) return; 
            const bubble = document.createElement('span'); bubble.className = 'bubble';
            const size = Math.random() * 50 + 15; 
            bubble.style.width = `${size}px`; bubble.style.height = `${size}px`;
            bubble.style.left = `${Math.random() * 100}vw`; 
            const duration = Math.random() * 12 + 8; 
            bubble.style.animationDuration = `${duration}s`;
            const delay = Math.random() * 7; 
            bubble.style.animationDelay = `${delay}s`;
            bubble.style.backgroundColor = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
            DOMElements.bubblesBackground.appendChild(bubble);
            bubble.addEventListener('animationend', () => { bubble.remove(); }, { once: true }); 
        }
        for (let i = 0; i < numBubblesInitial; i++) { 
            setTimeout(createSingleBubble, i * (Math.random() * 400 + 100)); 
        }
        if (continuousInterval > 0) { 
            setInterval(createSingleBubble, continuousInterval); 
        }
    }

    // #############################################################################
    // # --- Initial Application Load ---
    // #############################################################################
    function initializeApp() {
        console.log("initializeApp called.");
        try {
            if (DOMElements.mainContent) DOMElements.mainContent.style.position = 'relative'; else console.warn("mainContent element not found during initialization.");
            loadDataFromLS();       
            initializeSidebar();    
            renderUsableModelsList(); 
            renderAgentCards();     
            renderWorkflowCards();  
            // startBubbleMachine(20, 3000); // --- MODIFIED --- Bubble animation call commented out
            
            const initialSection = DOMElements.sidebarLinks && DOMElements.sidebarLinks[0]?.dataset.section || 'agent-dashboard';
            if (DOMElements.sidebarLinks && DOMElements.sidebarLinks.length > 0) { showSection(initialSection, true); } 
            else { console.warn("No sidebar links found, cannot determine initial section via sidebar. Falling back."); const defaultFallbackSection = document.getElementById('agent-dashboard-section'); if (defaultFallbackSection) { DOMElements.contentSections.forEach(s => s.style.display = 'none'); defaultFallbackSection.style.display = 'block'; defaultFallbackSection.classList.add('section-is-visible'); currentVisibleSection = defaultFallbackSection; console.log("Showing 'agent-dashboard-section' as fallback initial section."); } else { console.error("CRITICAL: Default fallback section 'agent-dashboard-section' also not found! App may not display content."); } }
            if(DOMElements.chatHistory) addMessageToChat(DOMElements.chatHistory, "system", "Conversation started. Type your message below."); else console.warn("chatHistory element not found for initial message.");
            if(DOMElements.workflowOutput) addMessageToLog(DOMElements.workflowOutput, 'System', 'Workflow output will appear here.', 'output-placeholder'); else console.warn("workflowOutput element not found for initial message.");
            if(DOMElements.masterAILogArea) addMessageToLog(DOMElements.masterAILogArea, 'System', 'Master AI actions and orchestration details will appear here when run.', 'log-placeholder'); else console.warn("masterAILogArea element not found for initial message.");
            if(DOMElements.masterAIFinalOutput) addMessageToLog(DOMElements.masterAIFinalOutput, 'System', 'Final synthesized output from Master AI will appear here...', 'final-output-placeholder'); else console.warn("masterAIFinalOutput element not found for initial message.");
            console.log("Gemini Studio Initialized Successfully.");
        } catch (error) {
            console.error("CRITICAL ERROR during initializeApp:", error);
            const body = document.body;
            if (body) { body.innerHTML = `<div style="padding: 20px; text-align: center; font-family: sans-serif; color: red; background-color: #fff5f5; border: 1px solid red; margin: 20px;"><h1>Application Initialization Error</h1><p>A critical error occurred while starting the application. Please check the browser console (F12) for more details and try refreshing the page.</p><pre style="text-align: left; background-color: #eee; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-break: break-all;">${error.stack || error.message}</pre></div>`; }
        }
    }
    initializeApp();
});