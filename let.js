document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired. Script starting...");

    // Import necessary functions and variables from l30.js
    const {
        // Settings & API Keys
        LSKeys_Settings,
        managedApiKeys, 
        globalSettings, 
        getFromLS,
        saveToLS,
        renderApiKeysSelect,
        saveManagedApiKeysToLS,
        loadManagedApiKeysFromLS,
        saveLastSelectedApiKey,
        renderUsableModelsList,
        populateAllModelSelects,
        saveGlobalSettingsToLS,
        loadGlobalSettingsFromLS,
        addApiKey,
        removeApiKey,
        addManualModel,
        discoverModels,
        removeModel,
        saveSettings,
        // Gemini API
        callGeminiAPI,
        // Agent Management
        agents as l30agents, 
        currentInteractingAgentId as l30CurrentInteractingAgentId, 
        generateId as l30GenerateId, 
        loadAgentsFromLS,
        renderAgentCards,
        setCurrentInteractingAgentId, 
        handleCreateNewAgent,
        handleAgentConfigFormSubmit,
        handleCancelAgentEdit,
        handleAgentListContainerClick,
        handleSendPrompt,
        // Workflow Management
        workflows as l30workflows,
        loadWorkflowsFromLS,
        renderWorkflowCards, 
        resetWorkflowEditorForm as l30ResetWorkflowEditorForm,
        populateAgentSelectorsForWorkflowAndMaster as l30PopulateAgentSelectors,
        handleAddAgentToWorkflow,
        handleWorkflowStepsUiContainerClick,
        handleSaveWorkflow,
        handleWorkflowListContainerClick,
        handleRunWorkflow,
        // Master AI Orchestrator
        handleRunMasterAI,
        handleStopMasterAI
    } = await import('./l30.js');


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
        bubblesBackground: document.getElementById('bubbles-background'), 

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

        agentConfigForm: document.getElementById('agent-config-form'),
        agentConfigTitle: document.getElementById('agent-config-heading'),
        agentIdInput: document.getElementById('agent-id'),
        agentNameInput: document.getElementById('agent-name'),
        systemPromptInput: document.getElementById('system-prompt'),
        agentModelSelect: document.getElementById('agent-gemini-model'),
        cancelAgentEditBtn: document.getElementById('cancel-agent-edit-btn'),

        createNewAgentBtn: document.getElementById('create-new-agent-btn'),
        agentListContainer: document.getElementById('agent-list-container'),

        backToDashboardBtn: document.getElementById('back-to-dashboard-btn'),
        interactionAgentName: document.getElementById('interaction-agent-name-heading'),
        interactionSystemPrompt: document.getElementById('interaction-system-prompt'),
        chatHistory: document.getElementById('chat-history'),
        userPromptInput: document.getElementById('user-prompt-input'),
        sendPromptBtn: document.getElementById('send-prompt-btn'),

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
    const LS_PREFIX_LET = 'geminiStudio_v3_'; 
    const LSKeys = { // Only keys specific to let.js UI state, others are in l30.js LSKeys_Settings
        SIDEBAR_COLLAPSED: `${LS_PREFIX_LET}sidebarCollapsed`,
    };
    
    // Core data state (managedApiKeys, globalSettings, l30agents, l30workflows, etc.) are imported from l30.js.
    // Master AI running state (isMasterAiRunning, etc.) is also managed in l30.js now.
    // Local state for UI transitions or flags not part of core data modules:
    let currentVisibleSection = null, isSidebarTransitioning = false, sectionTransitionTimeout = null;
    // Note: isMasterAiRunning, masterAiStopFlag, currentMasterAiApiKey, currentMasterAiApiKeyIndex are removed from let.js

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
    // # --- Settings & API Key Management (Event listeners call handlers from l30.js) ---
    // #############################################################################
    DOMElements.addApiKeyBtn?.addEventListener('click', () => addApiKey(DOMElements.newApiKeyInput.value.trim(), showToast));
    DOMElements.removeApiKeyBtn?.addEventListener('click', () => removeApiKey(DOMElements.apiKeySelect.value, showToast));
    DOMElements.apiKeySelect?.addEventListener('change', () => saveLastSelectedApiKey(DOMElements.apiKeySelect.value));
    DOMElements.availableModelsList?.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.remove-model-btn');
        if (removeButton) {
            const listItem = removeButton.closest('.list-item');
            const modelNameToRemove = listItem.dataset.modelName;
            if (confirm(`Remove model: ${modelNameToRemove}?`)) {
                animateElement(listItem, 'item-exit-active', false);
                listItem.addEventListener('animationend', () => {
                    removeModel(modelNameToRemove, showToast); 
                    renderUsableModelsList(updatePlaceholderVisibility, animateElement); 
                }, { once: true });
            }
        }
    });
    DOMElements.addManualModelBtn?.addEventListener('click', () => {
        if (addManualModel(DOMElements.manualModelNameInput.value.trim(), showToast)) {
            renderUsableModelsList(updatePlaceholderVisibility, animateElement);
        }
    });
    DOMElements.discoverModelsBtn?.addEventListener('click', () => {
        showToast('Discover Models (Mock): Simulating discovery of default models.', 'info');
        if (discoverModels(showToast)) { 
            renderUsableModelsList(updatePlaceholderVisibility, animateElement);
        }
    });
    DOMElements.saveSettingsBtn?.addEventListener('click', () => {
        if (DOMElements.defaultGeminiModelSelect) {
            saveSettings(DOMElements.defaultGeminiModelSelect.value, showToast); 
        } else {
            console.warn("Default Gemini Model Select element not found. Cannot save settings.");
        }
    });

    // #############################################################################
    // # --- Agent Management (Event listeners call handlers from l30.js) ---
    // #############################################################################
    DOMElements.createNewAgentBtn?.addEventListener('click', () => handleCreateNewAgent(showSection));
    DOMElements.agentConfigForm?.addEventListener('submit', (e) => handleAgentConfigFormSubmit(e, showSection, showToast, animateElement, updatePlaceholderVisibility, l30PopulateAgentSelectors));
    DOMElements.cancelAgentEditBtn?.addEventListener('click', () => handleCancelAgentEdit(showSection));
    DOMElements.agentListContainer?.addEventListener('click', (e) => {
        handleAgentListContainerClick(
            e, showSection, showToast, addMessageToChat, animateElement, 
            updatePlaceholderVisibility, l30PopulateAgentSelectors, 
            l30workflows, 
            () => saveToLS(LSKeys_Settings.WORKFLOWS, l30workflows), 
            () => renderWorkflowCards(animateElement, updatePlaceholderVisibility) 
        );
    });

    // #############################################################################
    // # --- Individual Agent Interaction (Event listeners call handlers in l30.js) ---
    // #############################################################################
    DOMElements.backToDashboardBtn?.addEventListener('click', () => {
        setCurrentInteractingAgentId(null); 
        showSection('agent-dashboard');
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
        handleSendPrompt(
            promptText, selectedApiKey, addMessageToChat, showToast, animateElement,
            { chatHistory: DOMElements.chatHistory, userPromptInput: DOMElements.userPromptInput, sendPromptBtn: DOMElements.sendPromptBtn }
        );
    });
    DOMElements.userPromptInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); DOMElements.sendPromptBtn?.click(); }
    });

    // #############################################################################
    // # --- Workflow Management (Event listeners call handlers from l30.js) ---
    // #############################################################################
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
        l30ResetWorkflowEditorForm(addMessageToLog, animateElement, updatePlaceholderVisibility); 
        showWorkflowEditor(); 
    });
    DOMElements.addAgentToWorkflowBtn?.addEventListener('click', () => {
        handleAddAgentToWorkflow(showToast, animateElement, updatePlaceholderVisibility); 
    });
    DOMElements.workflowStepsUiContainer?.addEventListener('click', (e) => {
        handleWorkflowStepsUiContainerClick(e, animateElement, updatePlaceholderVisibility); 
    });
    DOMElements.cancelWorkflowEditBtn?.addEventListener('click', () => {
        hideWorkflowEditor(() => l30ResetWorkflowEditorForm(addMessageToLog, animateElement, updatePlaceholderVisibility)); 
    });
    DOMElements.saveWorkflowBtn?.addEventListener('click', () => {
        handleSaveWorkflow( hideWorkflowEditor, showToast, addMessageToLog, animateElement, updatePlaceholderVisibility );
    });
    DOMElements.workflowListContainer?.addEventListener('click', (e) => {
        handleWorkflowListContainerClick( e, showWorkflowEditor, hideWorkflowEditor, showToast, addMessageToLog, animateElement, updatePlaceholderVisibility );
    });
    DOMElements.runWorkflowBtn?.addEventListener('click', async () => {
        const apiKeyToUse = currentMasterAiApiKey || DOMElements.apiKeySelect.value; // currentMasterAiApiKey is now from l30 via import (though not directly used, this pattern is for Master AI run)
        handleRunWorkflow( apiKeyToUse, addMessageToLog, showToast /* masterAiStopFlag will be from l30.js if needed by handleRunWorkflow */ );
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
    
    // #############################################################################
    // # --- Master AI Orchestrator (Event listeners call handlers from l30.js) ---
    // #############################################################################
    DOMElements.runMasterAIBtn?.addEventListener('click', async () => {
        handleRunMasterAI(addMessageToLog, showToast, animateElement, updatePlaceholderVisibility, l30PopulateAgentSelectors);
    });

    DOMElements.stopMasterAIBtn?.addEventListener('click', () => {
        handleStopMasterAI(addMessageToLog);
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
            renderUsableModelsList(updatePlaceholderVisibility, animateElement); 
            renderAgentCards(animateElement, updatePlaceholderVisibility, l30PopulateAgentSelectors); 
            renderWorkflowCards(animateElement, updatePlaceholderVisibility); 
            l30PopulateAgentSelectors(); 
            
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

// Export DOMElements and LSKeys for l30.js or other modules if needed.
export { DOMElements, LSKeys };