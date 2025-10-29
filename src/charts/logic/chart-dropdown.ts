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

export interface ChartItem {
    id: string;
    label: string;
    group?: {id:string, label: string}
}

/**
 * ChartDropdown manages a hierarchical dropdown menu for chart series selection.
 * It supports both individual series and grouped series with nested checkboxes.
 */
export class ChartDropdown {
    private container: HTMLElement | null;
    private isOpen: boolean;
    private selectedItems: Set<string>;
    private chartItems: Map<string, ChartItem>;

    // Properties to store bound event handlers for easy removal
    private boundToggleDropdownHandler: (e: Event) => void;
    private boundCloseDropdownHandler: () => void;
    private boundMenuClickHandler: (e: Event) => void;

    // New property to store the callback
    private onSelectionChangeCallback: ((selectedSeries: Set<string>) => void) | undefined;

    constructor(containerId: string, onSelectionChange?: (selectedSeries: Set<string>) => void) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found`);
        }

        this.isOpen = false;
        this.selectedItems = new Set<string>();
        this.chartItems = new Map<string, ChartItem>();
        // this.group

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
     * addItem
     */
    private addItem(chartItem: ChartItem) {
        const { id, label, group} = chartItem;
        
        if (this.chartItems.has(id)) {
            console.warn(`item with ID '${id}' already exists. Skipping...`);
            return;
        }

        this.chartItems.set(id, chartItem);
        this.selectedItems.add(id); // Visible by default

        if (!group) {
            // add individual item 
            this.container?.appendChild(this.createItemElement(id, label));
            this.bindSeriesEvents(id);  
        } else {
            const groupId = group.id
            const groupLabel = group.label

            // add group item
            let groupElement = this.container?.querySelector(`[data-group-id="${groupId}"]`);
            if (!groupElement) {
                groupElement = this.createGroupElement(groupId, groupLabel);
                this.container?.appendChild(groupElement);
                this.bindGroupEvents(groupId);  
            }

            // Add sub items
            const groupSubList = this.container?.querySelector(`#${CSS.escape(groupId)}-options`)
            groupSubList?.appendChild(this.createSubItemElement(id, groupId, label));
            this.bindSubItemEvent(id)


            // After elements are created, update the group checkbox state
            this.updateGroupCheckboxState(groupId);

        }
        this.updateDisplay();
    }

    /**
     * Remove item from any collections tracking it and from html base container
     */
    public removeItem(itemId: string) {
        const chartItem = this.chartItems.get(itemId)
        if (chartItem) {
            this.selectedItems.delete(itemId);
            this.chartItems.delete(itemId)
            this.container?.querySelector(`[data-series-id="${itemId}"]`)?.remove()

            // If group item, remove group element if there's no item left in it
            const groupId = chartItem.group?.id
            if (groupId) {
                const sameGroupItem = [...this.chartItems.values()].find(i => i.group?.id === groupId)
                if (!sameGroupItem) {
                    this.container?.querySelector(`[data-group-id="${groupId}"]`)?.remove()
                }
            }
        }
        this.updateDisplay();        
    }

    /**
     * Replace old items with new ones.
     * Safely remove old items from collections tracking them 
     * and from base html container
     */
    public update(chartItems: ChartItem[]) {
        // Remove existing items
        for (const itemId of this.chartItems.keys()) {
            this.removeItem(itemId)
        }

        // Add new items
        chartItems.forEach(i => this.addItem(i))

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
        this.selectedItems.clear();
        this.chartItems.clear();

        // Reset internal state
        this.isOpen = false;

        // Nullify container reference to help with garbage collection if the instance itself is dereferenced.
        // this.container = null; // This is fine as `container` type is `HTMLElement | null`
    }

    // ===== Private Helper Methods =====

    // --- Element Creation ---
    
    private createItemElement(seriesId: string, seriesName: string): HTMLLIElement {
        const li: HTMLLIElement = document.createElement('li');
        li.className = 'dropdown-item';
        li.dataset.seriesId = seriesId;

        const itemHeader: HTMLDivElement = document.createElement('div');
        itemHeader.className = 'item-header';

        const checkbox: HTMLInputElement = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'series-checkbox';
        checkbox.id = seriesId;
        checkbox.checked = this.selectedItems.has(seriesId); // Ensure checkbox reflects current selection state

        const label: HTMLLabelElement = document.createElement('label');
        label.setAttribute('for', seriesId);
        label.textContent = seriesName;

        itemHeader.appendChild(checkbox);
        itemHeader.appendChild(label);
        li.appendChild(itemHeader);

        return li;
    }
    
    private createSubItemElement(itemId: string, groupId: string, seriesName: string): HTMLLIElement {
        const subItem = document.createElement('li');
        subItem.className = 'sub-item';

        const subCheckbox = document.createElement('input');
        subCheckbox.type = 'checkbox';
        subCheckbox.className = 'sub-checkbox';
        subCheckbox.id = itemId;
        subCheckbox.dataset.group = groupId;
        subCheckbox.checked = this.selectedItems.has(itemId); // Reflects current selection state

        const subLabel = document.createElement('label');
        subLabel.setAttribute('for', itemId);
        subLabel.textContent = seriesName;

        subItem.appendChild(subCheckbox);
        subItem.appendChild(subLabel);

        return subItem;
    }

    /**
     * createGroupElement
     */
    private createGroupElement(groupId: string, groupName: string): HTMLLIElement {
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

        const groupLabel: HTMLLabelElement = document.createElement('label');
        groupLabel.setAttribute('for', `${groupId}-group`);
        groupLabel.textContent = groupName;

        itemHeader.appendChild(groupCheckbox);
        itemHeader.appendChild(groupLabel);

        const subList: HTMLUListElement = document.createElement('ul');
        subList.classList = 'dropdown-list sub-list'
        subList.id = `${groupId}-options`;

        li.appendChild(itemHeader);
        li.appendChild(subList);

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
    }

    private bindSubItemEvent(seriesId: string) {
        const subCheckbox = this.container?.querySelector(`#${CSS.escape(seriesId)}.sub-checkbox`);
        
        subCheckbox?.addEventListener('change', (e: Event) => {
            e.stopPropagation();
            this.handleSubCheckbox(e.target as HTMLInputElement);
        });
    }

    // --- UI State Management ---

    private updateDisplay(): void {
        const dropdownText = document.getElementById('dropdownText');
        if (!dropdownText) return;
        
        const count = this.selectedItems.size;
        
        if (count === 0) {
            dropdownText.textContent = 'Series...';
        } else if (count === 1) {
            const selectedId = Array.from(this.selectedItems)[0];
            // Try to find the label within the container for better scoping
            const label = this.container?.querySelector(`label[for="${CSS.escape(selectedId)}"]`) || document.querySelector(`label[for="${CSS.escape(selectedId)}"]`);
            const labelText = label?.textContent || selectedId;
            dropdownText.innerHTML = `${labelText} <span class="selected-count">(1 series)</span>`;
        } else {
            dropdownText.innerHTML = `Multiple series <span class="selected-count">(${count} selected)</span>`;
        }

        // Toggle series visiblilities
        if (this.onSelectionChangeCallback) {
            this.onSelectionChangeCallback(new Set(this.selectedItems)); // Pass a copy to prevent external modification
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

        if (checkbox.checked) {
            this.selectedItems.add(key);
        } else {
            this.selectedItems.delete(key);
        }
    }
}