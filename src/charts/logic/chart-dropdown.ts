/**
 * Required HTML Structure:
 * ```html
 * <div id="containerId">
 *   <button id="dropdownTrigger">
 *     <span id="dropdownText">Series...</span>
 *     <span id="dropdownArrow"></span>
 *   </button>
 *   <div id="dropdownMenu" class="dropdown-menu">
 *     <ul id="dropdownList" class="dropdown-list main-lis">
 *       <!-- Dropdown items will be inserted here -->
 *     </ul>
 *   </div>
 * </div>
 * ```
 * 
 * Generated Series Item Structure:
 * ```html
 * <li class="dropdown-item series-item" data-series-id="seriesId">
 *  <div class="item-header">
 *   <input type="checkbox" class="series-checkbox" id="seriesId">
 *   <label for="seriesId">Series Name</label>
 *  </div>
 * </li>
 * ```
 * 
 * Generated Group Structure:
 * ```html
 * <li class="dropdown-item" data-group-id="groupId">
 *   <div class="item-header" data-group="groupId">
 *     <input type="checkbox" class="group-checkbox" id="groupId-group">
 *     <label for="groupId-group">Group Name</label>
 *   </div>
 *   <ul class="dropdown-list sub-list" id="groupId-options">
 *     <li class="sub-item">
 *       <input type="checkbox" class="sub-checkbox" id="seriesId" data-group="groupId">
 *       <label for="seriesId">Series Name</label>
 *     </li>
 *     <!-- More sub-item... -->
 *   </ul>
 * </li>
 * ```
 */

import {
    SeriesKey,
    SeriesItem,
    SeriesGroup,
    isValidSeriesKey,
} from './series-config'; // Adjust path as needed

/**
 * ChartDropdown manages a hierarchical dropdown menu for chart series selection.
 * It supports both individual series and grouped series with nested checkboxes.
 */
export class ChartDropdown {
    private container: HTMLElement | null;
    private isOpen: boolean;
    private selectedSeries: Set<SeriesKey>;
    private individualSeries: Map<SeriesKey, SeriesItem>;
    private seriesGroups: Map<string, SeriesGroup>;

    // Properties to store bound event handlers for easy removal
    private boundToggleDropdownHandler: (e: Event) => void;
    private boundCloseDropdownHandler: () => void;
    private boundMenuClickHandler: (e: Event) => void;

    // New property to store the callback
    private onSelectionChangeCallback: ((selectedSeries: Set<SeriesKey>) => void) | undefined;

    constructor(containerId: string, onSelectionChange?: (selectedSeries: Set<SeriesKey>) => void) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found`);
        }

        this.isOpen = false;
        this.selectedSeries = new Set<SeriesKey>();
        this.individualSeries = new Map<SeriesKey, SeriesItem>();
        this.seriesGroups = new Map<string, SeriesGroup>();

        // Store callback if provided
        this.onSelectionChangeCallback = onSelectionChange;

        // Initialize bound handlers
        this.boundToggleDropdownHandler = (e: Event) => {
            e.stopPropagation();
            this.toggleDropdown();
        };
        this.boundCloseDropdownHandler = () => this.closeDropdown();
        this.boundMenuClickHandler = (e: Event) => e.stopPropagation();

        this.init();
    }

    // ===== Public API =====

    /**
     * Adds an individual series item to the dropdown.
     * Series are visible by default when added.
     */
    public addSeries(seriesItem: SeriesItem): void {
        const { id, name } = seriesItem;

        if (this.individualSeries.has(id)) {
            console.warn(`Series with ID '${id}' already exists. Skipping.`);
            return;
        }

        this.individualSeries.set(id, seriesItem);
        this.selectedSeries.add(id); // Visible by default

        const seriesElement = this.createSeriesElement(id, name);
        this.container?.appendChild(seriesElement);
        
        this.bindSeriesEvents(id);
        this.updateDisplay();
    }

    /**
     * Adds a group of related series items.
     * All series in the group are visible by default.
     */
    public addSeriesGroup(seriesGroup: SeriesGroup): void {
        const { id, name, seriesItems: series } = seriesGroup;

        if (this.seriesGroups.has(id)) {
            console.warn(`Group with ID '${id}' already exists. Skipping.`);
            return;
        }

        this.seriesGroups.set(id, seriesGroup);
        series.forEach(s => this.selectedSeries.add(s.id)); // All visible by default
        
        const groupElement = this.createGroupElement(id, name, series);
        this.container?.appendChild(groupElement);

        // 
        // this.updateGroupCheckboxState(id);
        
        this.bindGroupEvents(id);
        this.updateDisplay();
    }
    
    /**
     * Removes an individual series from the dropdown.
     * This will update the UI and remove the series from selection.
     */
    public removeSeries(seriesId: SeriesKey): void {
        const seriesElement = this.container?.querySelector(`[data-series-id="${seriesId}"]`);
        seriesElement?.remove();

        if (this.individualSeries.has(seriesId)) {
            this.selectedSeries.delete(seriesId);
            this.individualSeries.delete(seriesId);
            this.updateDisplay();
        }
    }

    /**
     * Removes a series group and all its contained series.
     * Updates UI and removes all group series from selection.
     */
    public removeSeriesGroup(groupId: string): void {
        const groupElement = this.container?.querySelector(`[data-group-id="${groupId}"]`);
        groupElement?.remove();

        const groupConfig = this.seriesGroups.get(groupId);
        if (groupConfig) {
            groupConfig.seriesItems.forEach(s => this.selectedSeries.delete(s.id));
            this.seriesGroups.delete(groupId);
            this.updateDisplay();
        }
    }

    /**
     * Updates the dropdown with new sets of individual series and series groups.
     * All existing series and groups are removed before adding the new ones.
     * Newly added series are selected by default.
     * @param newIndividualSeries Optional array of individual series items to add.
     * @param newSeriesGroups Optional array of series group configurations to add.
     */
    public update(newIndividualSeries?: SeriesItem[], newSeriesGroups?: SeriesGroup[]): void {
        // Remove all existing individual series
        const currentIndividualIds = Array.from(this.individualSeries.keys());
        currentIndividualIds.forEach(id => {
            this.removeSeries(id); // This method handles DOM removal and internal map/set updates
        });

        // Remove all existing series groups
        const currentGroupIds = Array.from(this.seriesGroups.keys());
        currentGroupIds.forEach(id => {
            this.removeSeriesGroup(id); // This method handles DOM removal and internal map/set updates
        });

        // Add new individual series if provided
        if (newIndividualSeries) {
            newIndividualSeries.forEach(seriesItem => {
                this.addSeries(seriesItem);
            });
        }

        // Add new series groups if provided
        if (newSeriesGroups) {
            newSeriesGroups.forEach(groupConfig => {
                this.addSeriesGroup(groupConfig);
            });
        }

        this.updateDisplay();
    }

    /**
     * Returns array of currently selected series IDs.
     */
    public getSelectedSeries(): Set<string> {
        return new Set(this.selectedSeries);
    }

    /**
     * Updates the selection state of series programmatically.
     * @param seriesIds - Array of series IDs to be selected
     */
    public setSelectedSeries(seriesIds: SeriesKey[]): void {
        this.selectedSeries.clear();
        
        const allCheckboxes = this.container?.querySelectorAll('.sub-checkbox, .series-checkbox') ?? [];
        allCheckboxes.forEach((checkbox: Element) => {
            const input = checkbox as HTMLInputElement;
            const isSelected = seriesIds.includes(input.id as SeriesKey);
            input.checked = isSelected;
            if (isSelected) this.selectedSeries.add(input.id as SeriesKey);
        });

        this.seriesGroups.forEach((_, groupId) => this.updateGroupCheckboxState(groupId));
        this.updateDisplay();
    }

    /**
     * Deselects all series and groups.
     */
    public clearAllSelections(): void {
        this.selectedSeries.clear();
        const allCheckboxes = this.container?.querySelectorAll('.sub-checkbox, .group-checkbox, .series-checkbox') ?? [];
        allCheckboxes.forEach((checkbox: Element) => {
            const input = checkbox as HTMLInputElement;
            input.checked = false;
            input.indeterminate = false;
        });
        this.updateDisplay();
    }

    /**
     * Cleans up resources, removes event listeners, and clears DOM elements.
     * The instance should not be used after calling destroy.
     */
    public destroy(): void {
        // Remove event listeners bound in bindEvents (to elements assumed to be outside the container)
        const trigger = document.getElementById('dropdownTrigger');
        if (trigger) {
            trigger.removeEventListener('click', this.boundToggleDropdownHandler);
        }
        document.removeEventListener('click', this.boundCloseDropdownHandler);
        const menu = document.getElementById('dropdownMenu');
        if (menu) {
            menu.removeEventListener('click', this.boundMenuClickHandler);
        }

        // Clear dynamically added DOM elements from the container.
        // This also helps in implicitly removing event listeners attached to these elements and their children.
        if (this.container) {
            this.container.innerHTML = '';
        }

        // Clear data structures
        this.selectedSeries.clear();
        this.seriesGroups.clear();
        this.individualSeries.clear();

        // Reset internal state
        this.isOpen = false;

        // Nullify container reference to help with garbage collection if the instance itself is dereferenced.
        // this.container = null; // This is fine as `container` type is `HTMLElement | null`
    }

    // ===== Private Helper Methods =====

    // --- Element Creation ---
    
    private createSeriesElement(seriesId: SeriesKey, seriesName: string): HTMLLIElement {
        const li: HTMLLIElement = document.createElement('li');
        li.className = 'dropdown-item';
        li.dataset.seriesId = seriesId;

        const itemHeader: HTMLDivElement = document.createElement('div');
        itemHeader.className = 'item-header';

        const checkbox: HTMLInputElement = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'series-checkbox';
        checkbox.id = seriesId;
        checkbox.checked = this.selectedSeries.has(seriesId); // Ensure checkbox reflects current selection state

        const label: HTMLLabelElement = document.createElement('label');
        label.setAttribute('for', seriesId);
        label.textContent = seriesName;

        itemHeader.appendChild(checkbox);
        itemHeader.appendChild(label);
        li.appendChild(itemHeader);

        return li;
    }

    private createGroupElement(groupId: string, groupName: string, series: SeriesItem[]): HTMLLIElement {
        const li: HTMLLIElement = document.createElement('li');
        li.className = 'dropdown-item';
        li.dataset.groupId = groupId;

        const itemHeader: HTMLDivElement = document.createElement('div');
        itemHeader.className = 'item-header';
        itemHeader.dataset.group = groupId;

        const groupCheckbox: HTMLInputElement = document.createElement('input');
        groupCheckbox.type = 'checkbox';
        groupCheckbox.className = 'group-checkbox';
        groupCheckbox.id = `${groupId}-group`;
        // Initial state of group checkbox depends on sub-items being selected
        // this.updateGroupCheckboxState will handle this after sub-items are created/added

        const groupLabel: HTMLLabelElement = document.createElement('label');
        groupLabel.setAttribute('for', `${groupId}-group`);
        groupLabel.textContent = groupName;

        itemHeader.appendChild(groupCheckbox);
        itemHeader.appendChild(groupLabel);

        const subList: HTMLUListElement = document.createElement('ul');
        subList.classList = 'dropdown-list sub-list'
        subList.id = `${groupId}-options`;

        series.forEach(seriesItem => {
            const subItem = document.createElement('li');
            subItem.className = 'sub-item';

            const subCheckbox = document.createElement('input');
            subCheckbox.type = 'checkbox';
            subCheckbox.className = 'sub-checkbox';
            subCheckbox.id = seriesItem.id;
            subCheckbox.dataset.group = groupId;
            subCheckbox.checked = this.selectedSeries.has(seriesItem.id); // Reflects current selection state

            const subLabel = document.createElement('label');
            subLabel.setAttribute('for', seriesItem.id);
            subLabel.textContent = seriesItem.name;

            subItem.appendChild(subCheckbox);
            subItem.appendChild(subLabel);
            subList.appendChild(subItem);
        });

        li.appendChild(itemHeader);
        li.appendChild(subList);

        // After elements are created, update the group checkbox state
        const checkedCount = series.filter(item => this.selectedSeries.has(item.id)).length;
        this.updateGroupCheckboxState(groupId, groupCheckbox, checkedCount, series.length);

        return li;
    }

    // --- Event Handling ---

    private init(): void {
        this.bindEvents(); // Bind static listeners
        this.updateDisplay();
    }

    private bindEvents(): void {
        // Use the stored bound handlers for easy removal in destroy()
        const trigger = document.getElementById('dropdownTrigger');
        if (trigger) {
            trigger.addEventListener('click', this.boundToggleDropdownHandler);
        }

        document.addEventListener('click', this.boundCloseDropdownHandler);

        const menu = document.getElementById('dropdownMenu');
        if (menu) {
            menu.addEventListener('click', this.boundMenuClickHandler);
        }
    }

    private bindSeriesEvents(seriesId: string): void {
        const seriesCheckbox = this.container?.querySelector(`#${CSS.escape(seriesId)}.series-checkbox`);
        seriesCheckbox?.addEventListener('change', (e: Event) => {
            e.stopPropagation();
            this.handleSeriesCheckbox(e.target as HTMLInputElement);
        });
    }

    private bindGroupEvents(groupId: string): void {
        const groupHeader = this.container?.querySelector(`.item-header[data-group="${groupId}"]`);
        groupHeader?.addEventListener('click', (e: Event) => {
            // Prevent toggling group when clicking on the checkbox itself
            if ((e.target as HTMLElement).closest('.group-checkbox')) {
                return;
            }
            e.stopPropagation();
            this.toggleGroup(groupId);
        });

        const groupCheckbox = this.container?.querySelector(`#${CSS.escape(groupId)}-group.group-checkbox`);
        groupCheckbox?.addEventListener('change', (e: Event) => {
            e.stopPropagation();
            this.handleGroupCheckbox(e.target as HTMLInputElement);
        });

        const subCheckboxes = this.container?.querySelectorAll(`.sub-checkbox[data-group="${groupId}"]`);
        subCheckboxes?.forEach(checkbox => {
            checkbox.addEventListener('change', (e: Event) => {
                e.stopPropagation();
                this.handleSubCheckbox(e.target as HTMLInputElement);
            });
        });
    }

    // --- UI State Management ---

    private updateDisplay(): void {
        const dropdownText = document.getElementById('dropdownText');
        if (!dropdownText) return;
        
        const count = this.selectedSeries.size;
        
        if (count === 0) {
            dropdownText.textContent = 'Series...';
        } else if (count === 1) {
            const selectedId = Array.from(this.selectedSeries)[0];
            // Try to find the label within the container for better scoping
            const label = this.container?.querySelector(`label[for="${CSS.escape(selectedId)}"]`) || document.querySelector(`label[for="${CSS.escape(selectedId)}"]`);
            const labelText = label?.textContent || selectedId;
            dropdownText.innerHTML = `${labelText} <span class="selected-count">(1 series)</span>`;
        } else {
            dropdownText.innerHTML = `Multiple series <span class="selected-count">(${count} selected)</span>`;
        }

        // Toggle series visiblilities
        if (this.onSelectionChangeCallback) {
            this.onSelectionChangeCallback(new Set(this.selectedSeries)); // Pass a copy to prevent external modification
        }
    }

    private toggleDropdown(): void {
        this.isOpen = !this.isOpen;
        document.getElementById('dropdownMenu')?.classList.toggle('open', this.isOpen);
        document.getElementById('dropdownArrow')?.classList.toggle('open', this.isOpen);
    }

    private closeDropdown(): void {
        if (this.isOpen) {
            this.isOpen = false;
            document.getElementById('dropdownMenu')?.classList.remove('open');
            document.getElementById('dropdownArrow')?.classList.remove('open');
        }
    }

    private toggleGroup(groupId: string): void {
        this.container?.querySelector(`#${CSS.escape(groupId)}-options`)?.classList.toggle('open');
        // Optionally, toggle an arrow icon for the group as well
        // this.container?.querySelector(`.item-header[data-group="${groupId}"] .group-arrow`)?.classList.toggle('open');
    }

    // --- Checkbox State Management ---
    
    private updateGroupCheckboxState(
        groupId: string, 
        groupCheckboxElement?: HTMLInputElement,
        checkedSubItems?: number,
        totalSubItems?: number
    ): void {
        const groupCheckbox = groupCheckboxElement || this.container?.querySelector(`#${CSS.escape(groupId)}-group`) as HTMLInputElement | null;
        if (!groupCheckbox) return;

        const checkedCount = checkedSubItems ?? this.container?.querySelectorAll(`.sub-checkbox[data-group="${groupId}"]:checked`).length ?? 0;
        const totalCount = totalSubItems ?? this.container?.querySelectorAll(`.sub-checkbox[data-group="${groupId}"]`)?.length ?? 0;
        
        if (checkedCount === 0) {
            groupCheckbox.checked = false;
            groupCheckbox.indeterminate = false;
        } else if (checkedCount === totalCount && totalCount > 0) { // Ensure totalCount is not zero to prevent checking an empty group
            groupCheckbox.checked = true;
            groupCheckbox.indeterminate = false;
        } else {
            groupCheckbox.checked = false; // Or true, depending on desired behavior for indeterminate
            groupCheckbox.indeterminate = true;
        }
    }

    private handleGroupCheckbox(groupCheckbox: HTMLInputElement): void {
        const groupId = groupCheckbox.closest('.item-header')?.getAttribute('data-group');
        if (!groupId) return;
        
        const subCheckboxes = this.container?.querySelectorAll(`.sub-checkbox[data-group="${groupId}"]`);
        subCheckboxes?.forEach(el => {
            const subCheckbox = el as HTMLInputElement;
            subCheckbox.checked = groupCheckbox.checked;
            this.updateSelectedItems(subCheckbox);
        });
        
        // If the group checkbox was manually set to a non-indeterminate state
        groupCheckbox.indeterminate = false;
        this.updateDisplay();
    }

    private handleSubCheckbox(subCheckbox: HTMLInputElement): void {
        this.updateSelectedItems(subCheckbox);
        const groupId = subCheckbox.dataset.group;
        if (groupId) {
            this.updateGroupCheckboxState(groupId);
        }
        this.updateDisplay();
    }

    private handleSeriesCheckbox(seriesCheckbox: HTMLInputElement): void {
        this.updateSelectedItems(seriesCheckbox);
        this.updateDisplay();
    }

    private updateSelectedItems(checkbox: HTMLInputElement): void {
        const key = checkbox.id;

        if (!isValidSeriesKey(key)) {
            console.warn(`Invalid SeriesKey: ${key}`);
            return;
        }

        if (checkbox.checked) {
            this.selectedSeries.add(key as SeriesKey);
        } else {
            this.selectedSeries.delete(key as SeriesKey);
        }
    }
}