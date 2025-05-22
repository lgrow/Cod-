'use strict';

import { DOMElements } from './let.js'; 

// #############################################################################
// # --- State & Local Storage Keys ---
// #############################################################################
const LS_PREFIX = 'geminiStudio_v3_';
export const LSKeys_Settings = { 
    MANAGED_API_KEYS: `${LS_PREFIX}managedApiKeys`,
    LAST_SELECTED_API_KEY: `${LS_PREFIX}lastSelectedApiKey`,
    GLOBAL_SETTINGS: `${LS_PREFIX}globalSettings`,
    AGENTS: `${LS_PREFIX}agents`, 
    WORKFLOWS: `${LS_PREFIX}workflows`, 
};

// Settings & API Keys State
export let managedApiKeys = [];
const defaultInitialModels = ['models/gemini-1.5-flash-latest', 'models/gemini-1.5-pro-latest'];
export let globalSettings = {
    defaultModel: 'gemini-1.5-flash-latest',
    usableModels: [...defaultInitialModels]
};

// Agent State
export let agents = []; 
export let currentEditingAgentId = null;
export let currentInteractingAgentId = null;

// Workflow State
export let workflows = [];
export let currentEditingWorkflowId = null; 
export let currentWorkflowSteps = [];   

// Master AI State
export let isMasterAiRunning = false;
export let masterAiStopFlag = false;
export let currentMasterAiApiKey = null;
export let currentMasterAiApiKeyIndex = -1;


// #############################################################################
// # --- Utility Functions ---
// #############################################################################
export const generateId = () => `id_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;

export const getFromLS = (key, defaultValue = null) => {
    const data = localStorage.getItem(key);
    try {
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.error(`Error parsing LS for key "${key}":`, e);
        return defaultValue;
    }
};

export const saveToLS = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving to LS for key "${key}":`, e);
    }
};

// #############################################################################
// # --- API Key Management (Global Settings) ---
// #############################################################################
export function renderApiKeysSelect(selectedKey = null) {
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

export function saveManagedApiKeysToLS() {
    saveToLS(LSKeys_Settings.MANAGED_API_KEYS, managedApiKeys);
}

export function loadManagedApiKeysFromLS() {
    managedApiKeys = getFromLS(LSKeys_Settings.MANAGED_API_KEYS, []);
    renderApiKeysSelect(getFromLS(LSKeys_Settings.LAST_SELECTED_API_KEY));
}

export function saveLastSelectedApiKey(key) {
    if (key) saveToLS(LSKeys_Settings.LAST_SELECTED_API_KEY, key);
    else localStorage.removeItem(LSKeys_Settings.LAST_SELECTED_API_KEY);
}

// #############################################################################
// # --- Model Management (Global Settings) ---
// #############################################################################
export function renderUsableModelsList(updatePlaceholderVisibility, animateElement) {
    if (!DOMElements.availableModelsList) return;
    DOMElements.availableModelsList.innerHTML = '';
    (globalSettings.usableModels || []).forEach(modelName => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.dataset.modelName = modelName;
        li.innerHTML = `<span>${modelName}</span><button class="button button-icon remove-model-btn" aria-label="Remove model ${modelName}">×</button>`;
        DOMElements.availableModelsList.appendChild(li);
        if (typeof animateElement === 'function') { 
            animateElement(li, 'item-enter-active');
        }
    });
    if (typeof updatePlaceholderVisibility === 'function') { 
        updatePlaceholderVisibility(DOMElements.availableModelsList, 'list-item-placeholder');
    }
    populateAllModelSelects();
}

export function populateAllModelSelects() {
    const models = globalSettings.usableModels || [];
    const defaultModelVal = globalSettings.defaultModel || (models.length > 0 ? models[0] : '');
    const selectors = [DOMElements.defaultGeminiModelSelect, DOMElements.agentModelSelect, /* Might add workflow/master AI model selectors here if they become dynamic */];
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

export function saveGlobalSettingsToLS() {
    saveToLS(LSKeys_Settings.GLOBAL_SETTINGS, globalSettings);
}

export function loadGlobalSettingsFromLS() {
    const loadedSettings = getFromLS(LSKeys_Settings.GLOBAL_SETTINGS);
    if (loadedSettings) {
        globalSettings.defaultModel = loadedSettings.defaultModel !== undefined ? loadedSettings.defaultModel : globalSettings.defaultModel;
        globalSettings.usableModels = (Array.isArray(loadedSettings.usableModels) && loadedSettings.usableModels.length > 0)
            ? loadedSettings.usableModels
            : [...defaultInitialModels];
    } else {
        globalSettings.usableModels = [...defaultInitialModels];
        globalSettings.defaultModel = (globalSettings.usableModels.length > 0) ? globalSettings.usableModels[0] : '';
    }
}

export function addApiKey(newKey, showToast) {
    if (newKey && newKey.length > 10) {
        if (!managedApiKeys.includes(newKey)) {
            managedApiKeys.push(newKey);
            saveManagedApiKeysToLS();
            renderApiKeysSelect(newKey);
            saveLastSelectedApiKey(newKey);
            if (DOMElements.newApiKeyInput) DOMElements.newApiKeyInput.value = '';
            showToast('API Key added!', 'success');
        } else { showToast('This API Key is already saved.', 'warning'); }
    } else { showToast('Please enter a valid API Key (must be longer than 10 characters).', 'error'); }
}

export function removeApiKey(selectedKey, showToast) {
    if (selectedKey) {
        if (confirm(`Are you sure you want to remove the selected API Key (${selectedKey.substring(0, 4)}...)?`)) {
            managedApiKeys = managedApiKeys.filter(key => key !== selectedKey);
            saveManagedApiKeysToLS();
            const lastSelected = getFromLS(LSKeys_Settings.LAST_SELECTED_API_KEY);
            if (lastSelected === selectedKey) {
                saveLastSelectedApiKey(null);
                renderApiKeysSelect();
            } else {
                renderApiKeysSelect(lastSelected);
            }
            showToast('API Key removed.', 'info');
        }
    } else { showToast('Please select an API Key to remove.', 'warning'); }
}

export function addManualModel(modelName, showToast) {
    if (modelName) {
        if (!(globalSettings.usableModels || []).includes(modelName)) {
            globalSettings.usableModels = [...(globalSettings.usableModels || []), modelName];
            saveGlobalSettingsToLS();
            if (DOMElements.manualModelNameInput) DOMElements.manualModelNameInput.value = '';
            showToast('Model added.', 'success');
            return true; 
        } else { showToast('Model name already exists.', 'warning'); }
    } else { showToast('Please enter a model name.', 'error'); }
    return false;
}

export function discoverModels(showToast) {
    const currentModels = globalSettings.usableModels || [];
    const newModelsDiscovered = defaultInitialModels.filter(dm => !currentModels.includes(dm));
    if (newModelsDiscovered.length > 0) {
        globalSettings.usableModels = [...currentModels, ...newModelsDiscovered];
        saveGlobalSettingsToLS();
        showToast(`${newModelsDiscovered.length} new default models added.`, 'success');
        return true; 
    } else {
        showToast('No new default models to add (already exist or none defined).', 'info');
    }
    return false;
}

export function removeModel(modelNameToRemove, showToast) {
    globalSettings.usableModels = (globalSettings.usableModels || []).filter(m => m !== modelNameToRemove);
    if (globalSettings.defaultModel === modelNameToRemove) {
        globalSettings.defaultModel = (globalSettings.usableModels && globalSettings.usableModels.length > 0) ? globalSettings.usableModels[0] : '';
    }
    saveGlobalSettingsToLS();
    showToast('Model removed.', 'info');
}

export function saveSettings(defaultModelValue, showToast) {
    globalSettings.defaultModel = defaultModelValue;
    saveGlobalSettingsToLS();
    showToast('Global settings saved!', 'success');
    populateAllModelSelects();
}

// #############################################################################
// # --- Gemini API Call Function ---
// #############################################################################
export async function callGeminiAPI(apiKey, modelName, userPrompt, systemPrompt = null) {
    // ... (Implementation as provided previously - assuming it's correct)
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
    let response;
    try {
        response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    } catch (networkError) {
        console.error("Gemini API Network Error:", networkError);
        throw new Error(`Network error while calling Gemini API: ${networkError.message}. Please check your internet connection.`);
    }
    const responseData = await response.json();
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
export function renderAgentCards(animateElement, updatePlaceholderVisibility, populateAgentSelectorsForWorkflowAndMasterFunc) {
    // ... (Implementation as provided previously)
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
                <p class="card-subtitle">Model: ${agent.model || globalSettings.defaultModel || 'Default (Global Setting)'}</p>
                <p class="card-text" title="${agent.systemPrompt || ''}">System Prompt: ${agent.systemPrompt ? promptSnippet : '<em>None defined</em>'}</p>
            </div>
            <div class="card-actions">
                <button class="button button-secondary interact-agent-btn">Interact</button>
                <button class="button button-secondary edit-agent-btn">Edit</button>
                <button class="button button-danger delete-agent-btn">Delete</button>
            </div>`;
        DOMElements.agentListContainer.appendChild(card);
        if (typeof animateElement === 'function') animateElement(card, 'item-enter-active');
    });
    if (typeof updatePlaceholderVisibility === 'function') updatePlaceholderVisibility(DOMElements.agentListContainer, 'card-placeholder');
    if (typeof populateAgentSelectorsForWorkflowAndMasterFunc === 'function') populateAgentSelectorsForWorkflowAndMasterFunc();
    else console.warn("populateAgentSelectorsForWorkflowAndMasterFunc not passed to renderAgentCards in l30.js");
}

export function resetAgentForm() {
    // ... (Implementation as provided previously)
    if (DOMElements.agentConfigForm) DOMElements.agentConfigForm.reset();
    if (DOMElements.agentIdInput) DOMElements.agentIdInput.value = '';
    currentEditingAgentId = null;
    if (DOMElements.agentConfigTitle) DOMElements.agentConfigTitle.textContent = 'Configure New Agent';
    if (DOMElements.cancelAgentEditBtn) DOMElements.cancelAgentEditBtn.style.display = 'none';
    populateAllModelSelects(); 
    if (DOMElements.agentModelSelect) {
        DOMElements.agentModelSelect.value = (globalSettings.defaultModel && (globalSettings.usableModels || []).includes(globalSettings.defaultModel))
            ? globalSettings.defaultModel
            : ((globalSettings.usableModels || []).length > 0 ? globalSettings.usableModels[0] : '');
    }
    if (DOMElements.agentNameInput) DOMElements.agentNameInput.focus();
}

export function saveAgentsToLS() { saveToLS(LSKeys_Settings.AGENTS, agents); }
export function loadAgentsFromLS() { agents = getFromLS(LSKeys_Settings.AGENTS, []); }
export function setCurrentInteractingAgentId(agentId) { currentInteractingAgentId = agentId; }

// #############################################################################
// # --- Individual Agent Interaction Handler ---
// #############################################################################
export async function handleSendPrompt( userPromptText, apiKey, addMessageToChatFunc, showToastFunc, animateElementFunc, domElements ) {
    // ... (Implementation as provided previously)
    if (!userPromptText || !currentInteractingAgentId) return;
    if (!apiKey) {
        showToastFunc("API Key not selected. Please select an API Key in Global Settings.", 'error');
        addMessageToChatFunc(domElements.chatHistory, 'error', '<strong>Error:</strong> API Key missing. Please configure it in Global Settings.');
        return;
    }
    addMessageToChatFunc(domElements.chatHistory, 'user', userPromptText);
    domElements.userPromptInput.value = ''; 
    domElements.userPromptInput.focus();
    const agent = agents.find(a => a.id === currentInteractingAgentId); 
    if (!agent) {
        addMessageToChatFunc(domElements.chatHistory, 'error', '<strong>Error:</strong> Agent configuration not found.');
        return;
    }
    const effectiveModel = agent.model || globalSettings.defaultModel; 
    if (!effectiveModel || !(globalSettings.usableModels || []).includes(effectiveModel)) {
        addMessageToChatFunc(domElements.chatHistory, 'error', `<strong>Error:</strong> Model "${effectiveModel}" for this agent is not available or not selected in global settings.`);
        return;
    }
    const thinkingDiv = addMessageToChatFunc(domElements.chatHistory, 'agent', '<i class="fas fa-spinner fa-spin"></i> Thinking...', true);
    domElements.sendPromptBtn.disabled = true;
    try {
        const responseText = await callGeminiAPI(apiKey, effectiveModel, userPromptText, agent.systemPrompt); 
        if (thinkingDiv && typeof animateElementFunc === 'function') {
             animateElementFunc(thinkingDiv, 'message-exit-active', false); 
             thinkingDiv.addEventListener('animationend', () => thinkingDiv.remove(), {once: true});
        } else if (thinkingDiv) thinkingDiv.remove(); 
        addMessageToChatFunc(domElements.chatHistory, 'agent', responseText);
    } catch (error) {
        console.error("Agent Interaction API Error Object (l30.js):", error);
        if (thinkingDiv) thinkingDiv.remove(); 
        const errorMessage = error.message || 'Failed to fetch or process API response. Check console for details.';
        addMessageToChatFunc(domElements.chatHistory, 'error', `<strong>Error:</strong> ${errorMessage}`);
    } finally {
        domElements.sendPromptBtn.disabled = false;
    }
}

// #############################################################################
// # --- Agent Management Event Handlers ---
// #############################################################################
export function handleCreateNewAgent(showSectionFunc) { resetAgentForm(); showSectionFunc('agent-configuration'); }
export function handleAgentConfigFormSubmit( event, showSectionFunc, showToastFunc, animateElementFunc,  updatePlaceholderVisibilityFunc,  populateAgentSelectorsFunc ) {
    // ... (Implementation as provided previously)
    event.preventDefault();
    const agentData = {
        id: DOMElements.agentIdInput.value || generateId(), 
        name: DOMElements.agentNameInput.value.trim(),
        systemPrompt: DOMElements.systemPromptInput.value.trim(),
        model: DOMElements.agentModelSelect.value
    };
    if (!agentData.name || !agentData.model) { showToastFunc('Agent Name and Model are required.', 'error'); return; }
    const isNew = !DOMElements.agentIdInput.value;
    if (isNew) agents.push(agentData);
    else {
        const existingIdx = agents.findIndex(a => a.id === agentData.id);
        if (existingIdx > -1) agents[existingIdx] = agentData; else agents.push(agentData); 
    }
    saveAgentsToLS(); 
    renderAgentCards(animateElementFunc, updatePlaceholderVisibilityFunc, populateAgentSelectorsFunc); 
    showSectionFunc('agent-dashboard');
    showToastFunc(`Agent "${agentData.name}" ${isNew ? 'created' : 'updated'} successfully!`, 'success');
}
export function handleCancelAgentEdit(showSectionFunc) { resetAgentForm(); showSectionFunc('agent-dashboard');}
export function handleAgentListContainerClick( event, showSectionFunc, showToastFunc, addMessageToChatFunc,  animateElementFunc,  updatePlaceholderVisibilityFunc,  populateAgentSelectorsFunc,  workflowsArray,  saveWorkflowsToLSFunc,  renderWorkflowCardsFunc ) {
    // ... (Implementation as provided previously, ensuring workflowsArray, saveWorkflowsToLSFunc, renderWorkflowCardsFunc are used for workflow updates on agent delete)
    const targetButton = event.target.closest('button');
    if (!targetButton) return;
    const agentCard = targetButton.closest('.agent-card');
    if (!agentCard) return;
    const agentId = agentCard.dataset.agentId;
    const agent = agents.find(a => a.id === agentId);
    if (!agent) { showToastFunc('Agent not found.', 'error'); return; }

    if (targetButton.classList.contains('edit-agent-btn')) {
        currentEditingAgentId = agent.id; 
        DOMElements.agentIdInput.value = agent.id;
        DOMElements.agentNameInput.value = agent.name;
        DOMElements.systemPromptInput.value = agent.systemPrompt;
        populateAllModelSelects(); 
        DOMElements.agentModelSelect.value = agent.model || globalSettings.defaultModel || ((globalSettings.usableModels || [])[0] || '');
        if (DOMElements.agentConfigTitle) DOMElements.agentConfigTitle.textContent = `Edit Agent: ${agent.name}`;
        if (DOMElements.cancelAgentEditBtn) DOMElements.cancelAgentEditBtn.style.display = 'inline-block';
        showSectionFunc('agent-configuration');
    } else if (targetButton.classList.contains('delete-agent-btn')) {
        if (confirm(`Are you sure you want to delete agent "${agent.name}"? This will also remove it from any workflows.`)) {
            const performDelete = () => {
                agents = agents.filter(a => a.id !== agentId);
                workflowsArray.forEach(wf => { wf.steps = wf.steps.filter(step => step.agentId !== agentId); });
                saveAgentsToLS();
                if(typeof saveWorkflowsToLSFunc === 'function') saveWorkflowsToLSFunc();
                renderAgentCards(animateElementFunc, updatePlaceholderVisibilityFunc, populateAgentSelectorsFunc);
                if(typeof renderWorkflowCardsFunc === 'function') renderWorkflowCardsFunc();
                showToastFunc(`Agent "${agent.name}" deleted.`, 'info');
            };
            if (typeof animateElementFunc === 'function') {
                animateElementFunc(agentCard, 'card-exit-active', false);
                agentCard.addEventListener('animationend', performDelete, { once: true });
            } else { 
                agentCard.remove(); performDelete();
            }
        }
    } else if (targetButton.classList.contains('interact-agent-btn')) {
        currentInteractingAgentId = agent.id; 
        if(DOMElements.interactionAgentName) DOMElements.interactionAgentName.textContent = `Chat with: ${agent.name}`;
        if(DOMElements.interactionSystemPrompt) DOMElements.interactionSystemPrompt.textContent = agent.systemPrompt || "No system prompt defined for this agent.";
        if(DOMElements.chatHistory) DOMElements.chatHistory.innerHTML = '';
        if(typeof addMessageToChatFunc === 'function') addMessageToChatFunc(DOMElements.chatHistory, "system", "Conversation started. Type your message below.");
        if(DOMElements.userPromptInput) DOMElements.userPromptInput.value = '';
        showSectionFunc('individual-agent-interaction');
        if(DOMElements.userPromptInput) DOMElements.userPromptInput.focus();
    }
}

// #############################################################################
// # --- Workflow Management Core Functions ---
// #############################################################################
export function populateAgentSelectorsForWorkflowAndMaster() { 
    // ... (Implementation as provided previously)
    const currentL30Agents = agents; 
    const selectors = [DOMElements.workflowAgentSelector, DOMElements.masterAIAgentSelector]; 
    selectors.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '';
        const defaultOptionText = select === DOMElements.masterAIAgentSelector ? '-- Select Master AI Orchestrator Agent --' : '-- Select Agent for Step --';
        select.innerHTML = `<option value="">${defaultOptionText}</option>`;
        if (currentL30Agents.length === 0 && select === DOMElements.workflowAgentSelector) {
            select.innerHTML = '<option value="">No agents created yet</option>';
        }
        currentL30Agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = `${agent.name} (Model: ${agent.model || globalSettings.defaultModel || 'Default'})`; 
            select.appendChild(option);
        });
        if (currentL30Agents.find(a => a.id === currentVal)) select.value = currentVal;
    });
}
export function renderWorkflowStepsUI(animateElementFunc, updatePlaceholderVisibilityFunc) { 
    // ... (Implementation as provided previously)
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
        if (typeof animateElementFunc === 'function') animateElementFunc(stepLi, 'item-enter-active');
    });
    if (typeof updatePlaceholderVisibilityFunc === 'function') {
        const parentDiv = DOMElements.workflowStepsUiContainer.closest('div');
        if (parentDiv) updatePlaceholderVisibilityFunc(parentDiv, 'list-item-placeholder');
        else updatePlaceholderVisibilityFunc(DOMElements.workflowStepsUiContainer, 'list-item-placeholder');
    }
}
export function resetWorkflowEditorForm(addMessageToLogFunc, animateElementFunc, updatePlaceholderVisibilityFunc) { 
    // ... (Implementation as provided previously)
    currentEditingWorkflowId = null; 
    if(DOMElements.workflowIdInput) DOMElements.workflowIdInput.value = '';
    if(DOMElements.workflowNameInput) DOMElements.workflowNameInput.value = '';
    if(DOMElements.workflowInitialInput) DOMElements.workflowInitialInput.value = '';
    currentWorkflowSteps = []; 
    renderWorkflowStepsUI(animateElementFunc, updatePlaceholderVisibilityFunc); 
    if (DOMElements.workflowOutput && typeof addMessageToLogFunc === 'function') {
        DOMElements.workflowOutput.innerHTML = ''; 
        addMessageToLogFunc(DOMElements.workflowOutput, 'System', 'Workflow output will appear here.', 'output-placeholder');
    }
    if (DOMElements.workflowEditorTitle) DOMElements.workflowEditorTitle.textContent = 'Create New Workflow';
    populateAgentSelectorsForWorkflowAndMaster(); 
    if(DOMElements.workflowNameInput) DOMElements.workflowNameInput.focus();
}
export function saveWorkflowsToLS() { saveToLS(LSKeys_Settings.WORKFLOWS, workflows); }
export function loadWorkflowsFromLS() { workflows = getFromLS(LSKeys_Settings.WORKFLOWS, []); }
export function renderWorkflowCards(animateElementFunc, updatePlaceholderVisibilityFunc) { 
    // ... (Implementation as provided previously)
    if (!DOMElements.workflowListContainer) return;
    DOMElements.workflowListContainer.innerHTML = '';
    workflows.forEach(wf => { 
        const card = document.createElement('div');
        card.className = 'card workflow-card'; card.dataset.workflowId = wf.id;
        card.innerHTML = `
            <div class="card-body"><h3 class="card-title">${wf.name}</h3><p class="card-text">${wf.steps.length} step(s)</p></div>
            <div class="card-actions"><button class="button button-secondary edit-workflow-btn">Edit</button><button class="button button-danger delete-workflow-btn">Delete</button></div>`;
        DOMElements.workflowListContainer.appendChild(card);
        if (typeof animateElementFunc === 'function') animateElementFunc(card, 'card-enter-active');
    });
    if (typeof updatePlaceholderVisibilityFunc === 'function') updatePlaceholderVisibilityFunc(DOMElements.workflowListContainer, 'card-placeholder');
}

// #############################################################################
// # --- Workflow Management Event Handlers ---
// #############################################################################
export function handleAddAgentToWorkflow(showToastFunc, animateElementFunc, updatePlaceholderVisibilityFunc) { 
    // ... (Implementation as provided previously)
    const agentId = DOMElements.workflowAgentSelector.value;
    if (agentId) {
        const agent = agents.find(a => a.id === agentId); 
        if (agent) {
            currentWorkflowSteps.push({ agentId: agent.id }); 
            renderWorkflowStepsUI(animateElementFunc, updatePlaceholderVisibilityFunc); 
        } else { if (typeof showToastFunc === 'function') showToastFunc('Selected agent not found. It might have been deleted.', 'warning'); }
    } else { if (typeof showToastFunc === 'function') showToastFunc('Please select an agent to add to the workflow.', 'warning'); }
}
export function handleWorkflowStepsUiContainerClick(event, animateElementFunc, updatePlaceholderVisibilityFunc) { 
    // ... (Implementation as provided previously)
    const removeButton = event.target.closest('.remove-step-btn');
    if (removeButton) {
        const stepItem = removeButton.closest('.workflow-step-item');
        const indexToRemove = parseInt(stepItem.dataset.stepIndex);
        if (typeof animateElementFunc === 'function') {
            animateElementFunc(stepItem, 'item-exit-active', false);
            stepItem.addEventListener('animationend', () => {
                currentWorkflowSteps.splice(indexToRemove, 1); 
                renderWorkflowStepsUI(animateElementFunc, updatePlaceholderVisibilityFunc); 
            }, { once: true });
        } else { 
            currentWorkflowSteps.splice(indexToRemove, 1);
            renderWorkflowStepsUI(null, updatePlaceholderVisibilityFunc);
        }
    }
}
export function handleSaveWorkflow( hideWorkflowEditorFunc, showToastFunc, addMessageToLogFunc, animateElementFunc, updatePlaceholderVisibilityFunc ) {
    // ... (Implementation as provided previously, ensure resetWorkflowEditorFormFunc is correctly called)
    const wfData = {
        id: DOMElements.workflowIdInput.value || generateId(), 
        name: DOMElements.workflowNameInput.value.trim(),
        steps: [...currentWorkflowSteps], 
        initialInput: DOMElements.workflowInitialInput.value.trim()
    };
    if (!wfData.name || wfData.steps.length === 0) { if (typeof showToastFunc === 'function') showToastFunc('Workflow Name and at least one Step are required.', 'error'); return; }
    const isNew = !DOMElements.workflowIdInput.value;
    if (isNew) workflows.push(wfData); 
    else {
        const existingIdx = workflows.findIndex(w => w.id === wfData.id);
        if (existingIdx > -1) workflows[existingIdx] = wfData; else workflows.push(wfData); 
    }
    saveWorkflowsToLS(); 
    renderWorkflowCards(animateElementFunc, updatePlaceholderVisibilityFunc); 
    if (typeof hideWorkflowEditorFunc === 'function') {
        hideWorkflowEditorFunc(() => resetWorkflowEditorForm(addMessageToLogFunc, animateElementFunc, updatePlaceholderVisibilityFunc));
    } else {
        resetWorkflowEditorForm(addMessageToLogFunc, animateElementFunc, updatePlaceholderVisibilityFunc);
    }
    if (typeof showToastFunc === 'function') showToastFunc(`Workflow "${wfData.name}" ${isNew ? 'created' : 'updated'}!`, 'success');
}
export function handleWorkflowListContainerClick( event, showWorkflowEditorFunc,  hideWorkflowEditorFunc,  showToastFunc,  addMessageToLogFunc,  animateElementFunc,  updatePlaceholderVisibilityFunc ) {
    // ... (Implementation as provided previously, ensure resetWorkflowEditorFormFunc is correctly called)
    const targetButton = event.target.closest('button');
    if (!targetButton) return;
    const wfCard = targetButton.closest('.workflow-card');
    if (!wfCard) return;
    const wfId = wfCard.dataset.workflowId;
    const wf = workflows.find(w => w.id === wfId); 
    if (!wf) { if (typeof showToastFunc === 'function') showToastFunc('Workflow not found.', 'error'); return; }

    if (targetButton.classList.contains('edit-workflow-btn')) {
        resetWorkflowEditorForm(addMessageToLogFunc, animateElementFunc, updatePlaceholderVisibilityFunc); 
        currentEditingWorkflowId = wf.id; 
        DOMElements.workflowIdInput.value = wf.id;
        DOMElements.workflowNameInput.value = wf.name;
        DOMElements.workflowInitialInput.value = wf.initialInput || "";
        currentWorkflowSteps = JSON.parse(JSON.stringify(wf.steps)); 
        renderWorkflowStepsUI(animateElementFunc, updatePlaceholderVisibilityFunc); 
        if (DOMElements.workflowEditorTitle) DOMElements.workflowEditorTitle.textContent = `Edit Workflow: ${wf.name}`;
        if (typeof showWorkflowEditorFunc === 'function') showWorkflowEditorFunc();
    } else if (targetButton.classList.contains('delete-workflow-btn')) {
        if (confirm(`Delete workflow "${wf.name}"?`)) {
            const animFunc = typeof animateElementFunc === 'function' ? animateElementFunc : (el, anim, rem) => el.remove();
            animFunc(wfCard, 'card-exit-active', false);
            const onAnimationEnd = () => {
                workflows = workflows.filter(w => w.id !== wfId);
                saveWorkflowsToLS(); 
                renderWorkflowCards(animateElementFunc, updatePlaceholderVisibilityFunc); 
                if (currentEditingWorkflowId === wfId) {
                    if (typeof hideWorkflowEditorFunc === 'function') {
                         hideWorkflowEditorFunc(() => resetWorkflowEditorForm(addMessageToLogFunc, animateElementFunc, updatePlaceholderVisibilityFunc));
                    } else {
                        resetWorkflowEditorForm(addMessageToLogFunc, animateElementFunc, updatePlaceholderVisibilityFunc);
                    }
                }
                if (typeof showToastFunc === 'function') showToastFunc(`Workflow "${wf.name}" deleted.`, 'info');
            };
            if (typeof animateElementFunc === 'function' && wfCard.style.animationName !== undefined) { 
                 wfCard.addEventListener('animationend', onAnimationEnd, { once: true });
            } else { onAnimationEnd(); }
        }
    }
}
export async function handleRunWorkflow(apiKeyToUse, addMessageToLogFunc, showToastFunc, masterAiStopFlagParam = false) { // Added default for stop flag
    // ... (Implementation as provided previously)
    const initialData = DOMElements.workflowInitialInput.value.trim();
    if (currentWorkflowSteps.length === 0) { if (typeof showToastFunc === 'function') showToastFunc('No steps in the workflow to run.', 'warning'); return; }
    if (!apiKeyToUse) {
        if (typeof showToastFunc === 'function') showToastFunc('API Key not selected. Please select an API Key in Global Settings.', 'error');
        if (typeof addMessageToLogFunc === 'function') addMessageToLogFunc(DOMElements.workflowOutput, 'System Error', '<strong>Error:</strong> API Key missing. Please configure it in Global Settings.', 'output-placeholder', true);
        return;
    }
    if (!initialData && currentWorkflowSteps.length > 0) { if (typeof showToastFunc === 'function') showToastFunc('Please provide an initial input for the workflow.', 'warning'); return; }
    if (DOMElements.workflowOutput) DOMElements.workflowOutput.innerHTML = '';
    if (typeof addMessageToLogFunc === 'function') addMessageToLogFunc(DOMElements.workflowOutput, 'Workflow', '<i class="fas fa-cog fa-spin"></i> Running workflow...', 'output-placeholder', true);
    let currentData = initialData;
    if(DOMElements.runWorkflowBtn) DOMElements.runWorkflowBtn.disabled = true;
    for (let i = 0; i < currentWorkflowSteps.length; i++) {
        if (masterAiStopFlagParam) { 
             if (typeof addMessageToLogFunc === 'function') addMessageToLogFunc(DOMElements.workflowOutput, 'Workflow', 'Stopped by orchestrator.', 'output-placeholder');
             break;
        }
        const step = currentWorkflowSteps[i];
        const agent = agents.find(a => a.id === step.agentId); 
        if (!agent) {
            if (typeof addMessageToLogFunc === 'function') addMessageToLogFunc(DOMElements.workflowOutput, 'Workflow Error', `<strong>Error:</strong> Agent for step ${i + 1} not found. Skipping step.`, 'output-placeholder', true);
            break;
        }
        const effectiveModel = agent.model || globalSettings.defaultModel; 
        if (!effectiveModel || !(globalSettings.usableModels || []).includes(effectiveModel)) {
            if (typeof addMessageToLogFunc === 'function') addMessageToLogFunc(DOMElements.workflowOutput, 'Workflow Error', `<strong>Error:</strong> Model '${effectiveModel}' for agent "${agent.name}" (Step ${i+1}) is not available.`, 'output-placeholder', true);
            break;
        }
        if (typeof addMessageToLogFunc === 'function') addMessageToLogFunc(DOMElements.workflowOutput, `Step ${i + 1}`, `Running agent "<i>${agent.name}</i>" (Model: ${effectiveModel}). Input (first 100 chars): ${currentData.substring(0,100)}...`, 'output-placeholder', true);
        try {
            await new Promise(r => setTimeout(r, 200)); 
            const stepOutput = await callGeminiAPI(apiKeyToUse, effectiveModel, currentData, agent.systemPrompt); 
            if (typeof addMessageToLogFunc === 'function') addMessageToLogFunc(DOMElements.workflowOutput, `${agent.name} Output`, stepOutput, 'output-placeholder');
            currentData = stepOutput;
        } catch (error) {
            console.error(`Workflow Step ${i+1} API Error (l30.js):`, error);
            if (typeof addMessageToLogFunc === 'function') addMessageToLogFunc(DOMElements.workflowOutput, 'Workflow Error', `<strong>Error in step ${i + 1} (${agent.name}):</strong> ${error.message}`, 'output-placeholder', true);
            break;
        }
    }
    if (typeof addMessageToLogFunc === 'function') addMessageToLogFunc(DOMElements.workflowOutput, 'Workflow', '<strong>Workflow finished.</strong>', 'output-placeholder', true);
    if(DOMElements.runWorkflowBtn) DOMElements.runWorkflowBtn.disabled = false;
}

// #############################################################################
// # --- Master AI Orchestrator ---
// #############################################################################
export async function handleRunMasterAI(addMessageToLogFunc, showToastFunc, animateElementFunc, updatePlaceholderVisibilityFunc, populateAgentSelectorsFunc) {
    const masterAgentId = DOMElements.masterAIAgentSelector.value;
    const goal = DOMElements.highLevelGoalInput.value.trim();
    
    currentMasterAiApiKey = DOMElements.apiKeySelect.value;
    if (currentMasterAiApiKey && managedApiKeys.length > 0) {
        currentMasterAiApiKeyIndex = managedApiKeys.indexOf(currentMasterAiApiKey);
        if (currentMasterAiApiKeyIndex === -1 && managedApiKeys.length > 0) {
            currentMasterAiApiKeyIndex = 0;
            currentMasterAiApiKey = managedApiKeys[0];
            DOMElements.apiKeySelect.value = currentMasterAiApiKey;
            saveLastSelectedApiKey(currentMasterAiApiKey); // Uses l30.js's version
            addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Initial API Key was invalid or not found, defaulting to first managed key: ${currentMasterAiApiKey.substring(0,4)}...`, 'log-placeholder');
        }
    } else if (managedApiKeys.length > 0) {
        currentMasterAiApiKeyIndex = 0;
        currentMasterAiApiKey = managedApiKeys[0];
        DOMElements.apiKeySelect.value = currentMasterAiApiKey;
        saveLastSelectedApiKey(currentMasterAiApiKey);
        addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `No API Key selected, defaulting to first managed key: ${currentMasterAiApiKey.substring(0,4)}...`, 'log-placeholder');
    } else {
         currentMasterAiApiKey = null;
         currentMasterAiApiKeyIndex = -1;
    }

    if (!currentMasterAiApiKey) { 
        showToastFunc('API Key missing. Please select or add one in Global Settings.', 'error'); 
        addMessageToLogFunc(DOMElements.masterAILogArea, 'System Error', '<strong>Error:</strong> API Key missing or no keys managed.', 'log-placeholder', true); return; 
    }
    
    if (!masterAgentId) { showToastFunc('Master AI Orchestrator Agent not selected.', 'warning'); addMessageToLogFunc(DOMElements.masterAILogArea, 'System Error', '<strong>Error:</strong> Master AI Orchestrator Agent not selected.', 'log-placeholder', true); return; }
    if (!goal) { showToastFunc('High-Level Goal for Master AI is missing.', 'warning'); addMessageToLogFunc(DOMElements.masterAILogArea, 'System Error', '<strong>Error:</strong> High-Level Goal for Master AI is missing.', 'log-placeholder', true); return; }
    
    const masterAgent = agents.find(a => a.id === masterAgentId); // agents is from l30.js state
    if (!masterAgent) { showToastFunc('Master AI Orchestrator Agent configuration not found.', 'error'); addMessageToLogFunc(DOMElements.masterAILogArea, 'System Error', '<strong>Error:</strong> Master AI Orchestrator Agent configuration not found.', 'log-placeholder', true); return; }
    
    const masterAgentModel = masterAgent.model || globalSettings.defaultModel; // globalSettings from l30.js state
    if (!masterAgentModel || !(globalSettings.usableModels || []).includes(masterAgentModel)) { 
        showToastFunc(`Master AI agent's model "${masterAgentModel}" is not available.`, 'error'); 
        addMessageToLogFunc(DOMElements.masterAILogArea, 'System Error', `<strong>Error:</strong> Master AI agent's model "${masterAgentModel}" is not available.`, 'log-placeholder', true); return; 
    }

    let MAX_ITERATIONS = 30; 
    if (DOMElements.masterAIMaxIterations) {
        const userMaxIterations = parseInt(DOMElements.masterAIMaxIterations.value, 10);
        if (!isNaN(userMaxIterations) && userMaxIterations >= 1 && userMaxIterations <= 50) { MAX_ITERATIONS = userMaxIterations; } 
        else { showToastFunc('Invalid Max Iterations value (must be 1-50). Using default (30).', 'warning'); if (DOMElements.masterAIMaxIterations) DOMElements.masterAIMaxIterations.value = "30"; }
    }
    
    if (DOMElements.masterAILogArea) DOMElements.masterAILogArea.innerHTML = '';
    addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Max Iterations set to: ${MAX_ITERATIONS}`, 'log-placeholder');
    addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Using initial API Key: ${currentMasterAiApiKey.substring(0,4)}... (Index: ${currentMasterAiApiKeyIndex})`, 'log-placeholder');

    isMasterAiRunning = true; 
    masterAiStopFlag = false;
    if (DOMElements.masterAIFinalOutput) { DOMElements.masterAIFinalOutput.innerHTML = ''; addMessageToLogFunc(DOMElements.masterAIFinalOutput, 'System', 'Final synthesized output from Master AI will appear here...', 'final-output-placeholder'); }

    addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `<i class="fas fa-brain fa-spin"></i> Starting Master AI Orchestration... Goal: "${goal}"`, 'log-placeholder', true);
    addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Using Master AI: "${masterAgent.name}" (Model: ${masterAgentModel})`, 'log-placeholder');
    DOMElements.runMasterAIBtn.disabled = true; 
    DOMElements.stopMasterAIBtn.style.display = 'inline-block';
    
    let iterationCount = 0;
    let accumulatedResultsHistory = ""; 

    while (iterationCount < MAX_ITERATIONS && !masterAiStopFlag) {
        iterationCount++;
        if (iterationCount > 1 && (iterationCount - 1) % 7 === 0) { // API Key Rotation
            if (managedApiKeys.length > 1) {
                currentMasterAiApiKeyIndex = (currentMasterAiApiKeyIndex + 1) % managedApiKeys.length;
                currentMasterAiApiKey = managedApiKeys[currentMasterAiApiKeyIndex];
                addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `API Key Rotated. Now using: ${currentMasterAiApiKey.substring(0,4)}... (Index: ${currentMasterAiApiKeyIndex})`, 'log-placeholder');
                showToastFunc(`API Key rotated to: ${currentMasterAiApiKey.substring(0,4)}...`, 'info', 2000);
            } else if (managedApiKeys.length === 1) {
                addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `API Key Rotation attempt: Only one key available. Sticking to ${currentMasterAiApiKey.substring(0,4)}...`, 'log-placeholder');
            } else { 
                addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `API Key Rotation attempt: No managed keys available. This should not happen. Stopping.`, 'log-placeholder');
                masterAiStopFlag = true; break;
            }
        }
        addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Iteration ${iterationCount}/${MAX_ITERATIONS}: Asking Master AI for the next step... (Using API Key: ${currentMasterAiApiKey.substring(0,4)}...)`, 'log-placeholder');
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
            addMessageToLogFunc(DOMElements.masterAILogArea, masterAgent.name, `Suggestion (Iter ${iterationCount}): ${masterAIResponse}`, 'log-placeholder');
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
                addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', "Master AI indicated task is complete.");
                const finalOutputMatch = masterAIResponse.match(finalOutputCaptureRegex);
                if (finalOutputMatch && finalOutputMatch[1] && finalOutputMatch[1].trim()) { taskCompleteOutput = finalOutputMatch[1].trim(); addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', "Explicit 'Final Output:' content found.", 'log-placeholder'); } 
                else { const fallbackOutputMatch = masterAIResponse.match(/TASK\s+COMPLETE\.\s*([\s\S]*)/i); if (fallbackOutputMatch && fallbackOutputMatch[1] && fallbackOutputMatch[1].trim()) { taskCompleteOutput = fallbackOutputMatch[1].trim(); addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', "Using content after 'TASK COMPLETE.' as final output.", 'log-placeholder'); } 
                       else { taskCompleteOutput = "Task is marked complete by Master AI, but no specific output was provided after 'Final Output:'."; addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', "No clear 'Final Output:' or subsequent content.", 'log-placeholder'); }
                }
                if (DOMElements.masterAIFinalOutput) {
                    DOMElements.masterAIFinalOutput.innerHTML = ''; 
                    if (taskCompleteOutput.includes('\n* ') || taskCompleteOutput.startsWith('* ')) { let htmlOutput = ''; const lines = taskCompleteOutput.split('\n'); let inList = false; lines.forEach(line => { line = line.trim(); if (line.startsWith('* ')) { if (!inList) { htmlOutput += '<ul>'; inList = true; } htmlOutput += `<li>${line.substring(2).trim()}</li>`; } else { if (inList) { htmlOutput += '</ul>'; inList = false; } if (line.length > 0) htmlOutput += `<p>${line}</p>`; } }); if (inList) htmlOutput += '</ul>'; addMessageToLogFunc(DOMElements.masterAIFinalOutput, 'Master AI', htmlOutput, 'final-output-placeholder', true); } 
                    else { addMessageToLogFunc(DOMElements.masterAIFinalOutput, 'Master AI', taskCompleteOutput, 'final-output-placeholder'); }
                }
                masterAiStopFlag = true; 
            } else {
                match = masterAIResponse.match(callRegex);
                if (match) {
                    planAction = "CALL"; planAgentName = match[1].trim();
                    try { const parsedInput = JSON.parse(match[2]); planAgentInput = parsedInput.prompt_text || match[2]; } 
                    catch (e) { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Warning: Parsing CALL input JSON failed: ${e.message}. Using raw string: ${match[2]}`, 'log-placeholder'); planAgentInput = match[2]; }
                } else {
                    match = masterAIResponse.match(createRegex);
                    if (match) {
                        planAction = "CREATE";
                        try { newAgentConfig = JSON.parse(match[1]); }
                        catch (e) { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Error parsing CREATE NEW AGENT JSON: ${e.message}. Raw: ${match[1]}`, 'log-placeholder'); newAgentConfig = null; }
                    } else {
                        match = masterAIResponse.match(editRegex);
                        if (match) {
                            planAction = "EDIT"; editAgentId = match[1].trim();
                            try { editAgentNewConfig = JSON.parse(match[2]); }
                            catch (e) { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Error parsing EDIT AGENT NEW_CONFIG JSON: ${e.message}. Raw: ${match[2]}`, 'log-placeholder'); editAgentNewConfig = null; }
                        }
                    }
                }
            }
            if (masterAiStopFlag) break; 
            if (planAction === "CALL" && planAgentName && planAgentInput) {
                const workerAgent = agents.find(a => a.name.toLowerCase() === planAgentName.toLowerCase()); 
                if (workerAgent) {
                    const workerModel = workerAgent.model || globalSettings.defaultModel; 
                    if (!workerModel || !(globalSettings.usableModels || []).includes(workerModel)) { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Error: Worker agent "${workerAgent.name}" model "${workerModel}" is not available. Skipping call.`, 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Attempted to call ${workerAgent.name} but its model ${workerModel} was invalid or unavailable.\n`; } 
                    else {
                        addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Calling agent "${workerAgent.name}" (Model: ${workerModel}) with input (first 100 chars): ${String(planAgentInput).substring(0,100)}...`, 'log-placeholder');
                        const workerResponse = await callGeminiAPI(currentMasterAiApiKey, workerModel, planAgentInput, workerAgent.systemPrompt);
                        addMessageToLogFunc(DOMElements.masterAILogArea, workerAgent.name, `Output: ${workerResponse}`, 'log-placeholder');
                        accumulatedResultsHistory += `Step ${iterationCount}: Called agent "${workerAgent.name}". Input: "${String(planAgentInput).substring(0, 50)}...". Output: "${workerResponse.substring(0, 100)}..."\n`;
                    }
                } else { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Error: Agent "${planAgentName}" suggested by Master AI was not found. Suggestion: Master AI should CREATE it if needed or check spelling.`, 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Attempted to call non-existent agent "${planAgentName}".\n`; }
            } else if (planAction === "CREATE" && newAgentConfig) {
                addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Master AI suggests CREATE AGENT: ${JSON.stringify(newAgentConfig)}`, 'log-placeholder');
                if (newAgentConfig.name && newAgentConfig.system_prompt && newAgentConfig.model) {
                    if (agents.find(a => a.name.toLowerCase() === newAgentConfig.name.toLowerCase())) { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Agent with name "${newAgentConfig.name}" already exists. Not creating. Master AI should check existing agents first.`, 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Master AI suggested creating agent "${newAgentConfig.name}", but it already exists.\n`; } 
                    else {
                        const newAgent = { id: generateId(), name: newAgentConfig.name, systemPrompt: newAgentConfig.system_prompt, model: (globalSettings.usableModels || []).includes(newAgentConfig.model) ? newAgentConfig.model : (globalSettings.defaultModel || (globalSettings.usableModels || [])[0] || 'gemini-1.5-flash-latest') };
                        agents.push(newAgent); 
                        saveAgentsToLS(); 
                        renderAgentCards(animateElementFunc, updatePlaceholderVisibilityFunc, populateAgentSelectorsFunc); 
                        populateAgentSelectorsFunc(); 
                        addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `SUCCESS: Agent "${newAgent.name}" created and saved by Master AI's request! It is now available for subsequent calls.`, 'log-placeholder');
                        accumulatedResultsHistory += `Step ${iterationCount}: Successfully created new agent "${newAgent.name}" as per Master AI. It is now available.\n`;
                    }
                } else { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', "CREATE AGENT command from Master AI was missing required fields (name, system_prompt, model). Cannot create agent.", 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Master AI's CREATE AGENT command was malformed or incomplete.\n`; }
            } 
            else if (planAction === "EDIT" && editAgentId && editAgentNewConfig) {
                addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Master AI suggests EDIT AGENT (ID: "${editAgentId}") with NEW_CONFIG: ${JSON.stringify(editAgentNewConfig)}`, 'log-placeholder');
                const agentIndex = agents.findIndex(a => a.id === editAgentId); 
                if (agentIndex > -1) {
                    let changed = false; const originalAgent = { ...agents[agentIndex] }; 
                    if (editAgentNewConfig.name && typeof editAgentNewConfig.name === 'string' && agents[agentIndex].name !== editAgentNewConfig.name.trim()) { agents[agentIndex].name = editAgentNewConfig.name.trim(); changed = true; }
                    if (editAgentNewConfig.system_prompt && typeof editAgentNewConfig.system_prompt === 'string' && agents[agentIndex].systemPrompt !== editAgentNewConfig.system_prompt.trim()) { agents[agentIndex].systemPrompt = editAgentNewConfig.system_prompt.trim(); changed = true; }
                    let newModel = agents[agentIndex].model; 
                    if (editAgentNewConfig.model && typeof editAgentNewConfig.model === 'string') {
                        const suggestedModel = editAgentNewConfig.model.trim();
                        if (suggestedModel.toUpperCase() === "AUTO_SELECT_BEST_MODEL_FOR_PROMPT") {
                            if (agents[agentIndex].systemPrompt !== originalAgent.systemPrompt) { newModel = globalSettings.defaultModel || (globalSettings.usableModels.length > 0 ? globalSettings.usableModels[0] : agents[agentIndex].model); addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `AUTO_SELECT_BEST_MODEL triggered for agent ${editAgentId}. New prompt detected. Switched to default model: ${newModel}`, 'log-placeholder'); } 
                            else { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `AUTO_SELECT_BEST_MODEL triggered for agent ${editAgentId}, but prompt unchanged. Keeping model: ${newModel}`, 'log-placeholder'); }
                        } else if ((globalSettings.usableModels || []).includes(suggestedModel)) { newModel = suggestedModel; } 
                        else { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Warning: Suggested model "${suggestedModel}" for edit is not in usable models list. Model will not be changed from "${newModel}".`, 'log-placeholder'); }
                    }
                    if (agents[agentIndex].model !== newModel) { agents[agentIndex].model = newModel; changed = true; }
                    if (changed) {
                        saveAgentsToLS();
                        renderAgentCards(animateElementFunc, updatePlaceholderVisibilityFunc, populateAgentSelectorsFunc); 
                        populateAgentSelectorsFunc(); 
                        addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `SUCCESS: Agent "${agents[agentIndex].name}" (ID: ${editAgentId}) updated by Master AI's request! New Model: ${agents[agentIndex].model}`, 'log-placeholder');
                        accumulatedResultsHistory += `Step ${iterationCount}: Successfully edited agent "${agents[agentIndex].name}" (ID: ${editAgentId}). New model: ${agents[agentIndex].model}.\n`;
                    } else { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Agent (ID: ${editAgentId}) found, but no valid changes provided in NEW_CONFIG or new values matched existing. No update performed. Current model: ${agents[agentIndex].model}`, 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Attempted to edit agent (ID: ${editAgentId}) but no changes were applied.\n`; }
                } else { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Error: Agent with ID "${editAgentId}" for EDIT AGENT command not found.`, 'log-placeholder'); accumulatedResultsHistory += `Step ${iterationCount}: Master AI attempted to edit non-existent agent with ID "${editAgentId}".\n`; }
            }
            else if (!planAction && !masterAiStopFlag) { 
                addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', "Master AI did not provide a clear CALL, CREATE, EDIT, or TASK COMPLETE instruction. Master AI response needs to be more precise. Trying to continue, or stopping if max iterations reached. Response was: " + masterAIResponse.substring(0,200) + "...", 'log-placeholder');
                accumulatedResultsHistory += `Step ${iterationCount}: Master AI response was unclear or did not match expected format: ${masterAIResponse.substring(0, 100)}...\n`;
            }
        } catch (error) {
            console.error("Master AI Orchestration Error (l30.js):", error);
            addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator Error', `<strong>Critical Error during Master AI step ${iterationCount}:</strong> ${error.message}`, 'log-placeholder', true); 
            masterAiStopFlag = true; 
        }
        if (iterationCount >= MAX_ITERATIONS && !masterAiStopFlag) {
            addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', `Max iterations (${MAX_ITERATIONS}) reached. Stopping orchestration.`, 'log-placeholder');
            if (DOMElements.masterAIFinalOutput && DOMElements.masterAIFinalOutput.querySelector('.final-output-placeholder')) { 
                DOMElements.masterAIFinalOutput.innerHTML = ''; 
                addMessageToLogFunc(DOMElements.masterAIFinalOutput, 'System', 'Orchestration stopped due to reaching maximum iterations before a "TASK COMPLETE" signal from Master AI.', 'final-output-placeholder');
            }
            masterAiStopFlag = true;
        }
        await new Promise(r => setTimeout(r, 500)); 
    } 
    if (masterAiStopFlag && !DOMElements.masterAILogArea.innerText.includes("TASK COMPLETE") && !DOMElements.masterAILogArea.innerText.includes("Stopped by user")) { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', "Orchestration stopped (likely due to error or max iterations).", 'log-placeholder'); if (DOMElements.masterAIFinalOutput && DOMElements.masterAIFinalOutput.querySelector('.final-output-placeholder')) { DOMElements.masterAIFinalOutput.innerHTML = ''; addMessageToLogFunc(DOMElements.masterAIFinalOutput, 'System', 'Orchestration stopped before a final output was explicitly generated by Master AI.', 'final-output-placeholder'); } } 
    else if (!DOMElements.masterAILogArea.innerText.includes("TASK COMPLETE") && !DOMElements.masterAILogArea.innerText.includes("stopped")) { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', "Orchestration finished (max iterations reached without explicit completion).", 'log-placeholder'); if (DOMElements.masterAIFinalOutput && DOMElements.masterAIFinalOutput.querySelector('.final-output-placeholder')) { DOMElements.masterAIFinalOutput.innerHTML = ''; addMessageToLogFunc(DOMElements.masterAIFinalOutput, 'System', 'Orchestration finished, but no explicit "TASK COMPLETE" with final output was issued by Master AI within the iteration limit.', 'final-output-placeholder'); } } 
    else if (DOMElements.masterAILogArea.innerText.includes("TASK COMPLETE")) { addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', "Orchestration successfully completed by Master AI.", 'log-placeholder'); }
    isMasterAiRunning = false; 
    DOMElements.runMasterAIBtn.disabled = false; 
    DOMElements.stopMasterAIBtn.style.display = 'none';
    currentMasterAiApiKey = null; 
    currentMasterAiApiKeyIndex = -1; 
}

export function handleStopMasterAI(addMessageToLogFunc) {
    if (isMasterAiRunning) {
        masterAiStopFlag = true;
        addMessageToLogFunc(DOMElements.masterAILogArea, 'Orchestrator', "<strong>Stop signal received. Attempting to halt orchestration gracefully after current step...</strong>", 'log-placeholder', true);
    } else { 
        DOMElements.stopMasterAIBtn.style.display = 'none'; 
    }
}
