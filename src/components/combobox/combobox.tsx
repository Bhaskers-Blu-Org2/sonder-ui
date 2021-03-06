/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT license. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { Component, Event, EventEmitter, Prop, State, Watch } from '@stencil/core';
import { SelectOption } from '../../shared/interfaces';
import { getActionFromKey, getUpdatedIndex, isScrollable, maintainScrollVisibility, MenuActions, uniqueId, filterOptions } from '../../shared/utils';

@Component({
  tag: 'sui-combobox',
  styleUrl: './combobox.css',
  shadow: false
})
export class SuiCombobox {
  /**
   * Whether the combobox should filter based on user input. Defaults to false.
   */
  @Prop() filter = false;

  /**
   * String label
   */
  @Prop() label: string;

  /**
   * Array of name/value options
   */
  @Prop() options: SelectOption[];

  /**
   * Emit a custom select event on value change
   */
  @Event({
    eventName: 'select'
  }) selectEvent: EventEmitter;

  // Active option index
  @State() activeIndex = 0;

  // Filtered options
  @State() filteredOptions: SelectOption[];

  // Menu state
  @State() open = false;

  // input value
  @State() value: string;

  // save reference to active option
  private activeOptionRef: HTMLElement;

  // Unique ID that should really use a UUID library instead
  private htmlId = uniqueId();

  // Prevent menu closing before click completed
  private ignoreBlur = false;

  // save reference to input element
  private inputRef: HTMLInputElement;

  // save reference to listbox
  private listboxRef: HTMLElement;

  // save the last selected value
  private selectedValue = '';

  @Watch('options')
  watchOptions(newValue: SelectOption[]) {
    if (this.filter) {
      this.filteredOptions = filterOptions(newValue, this.value);
    }
  }

  componentDidLoad() {
    const {
      filter = false,
      options = [],
      value = ''
    } = this;
    this.filteredOptions = filter ? filterOptions(options, value) : options;
    this.value = typeof this.value === 'string' ? value : this.filteredOptions.length > 0 ? this.filteredOptions[0].name : '';
  }

  componentDidUpdate() {
    if (this.open && isScrollable(this.listboxRef)) {
      maintainScrollVisibility(this.activeOptionRef, this.listboxRef);
    }
  }

  render() {
    const {
      activeIndex,
      htmlId,
      filter = false,
      label = '',
      open = false,
      filteredOptions = [],
      value
    } = this;

    const activeId = open ? `${htmlId}-${activeIndex}` : '';

    return ([
      <label id={htmlId} class="combo-label">{label}</label>,
      <div class={{ combo: true, open }}>
        <input
          aria-activedescendant={activeId}
          aria-autocomplete={filter ? "list" : "none"}
          aria-controls={`${htmlId}-listbox`}
          aria-expanded={`${open}`}
          aria-haspopup="listbox"
          aria-labelledby={htmlId}
          class="combo-input"
          ref={(el) => this.inputRef = el}
          role="combobox"
          type="text"
          value={value}
          onBlur={this.onInputBlur.bind(this)}
          onClick={() => this.updateMenuState(true)}
          onInput={this.onInput.bind(this)}
          onKeyDown={this.onInputKeyDown.bind(this)}
        />

        <div class="combo-menu" role="listbox" ref={(el) => this.listboxRef = el} id={`${htmlId}-listbox`}>
          {filteredOptions.map((option, i) => {
            return (
              <div
                class={{ 'option-current': this.activeIndex === i, 'combo-option': true }}
                id={`${this.htmlId}-${i}`}
                aria-selected={this.activeIndex === i ? 'true' : false}
                ref={(el) => {if (this.activeIndex === i) this.activeOptionRef = el; }}
                role="option"
                onClick={() => { this.onOptionClick(i); }}
                onMouseDown={this.onOptionMouseDown.bind(this)}
              >{option.name}</div>
            );
          })}
        </div>
      </div>
    ]);
  }

  private onInput() {
    const curValue = this.inputRef.value;
    const matches = filterOptions(this.options, curValue);

    // if we're filtering options, just need to set activeIndex to 0
    if (this.filter) {
      this.filteredOptions = [...matches];
      this.activeIndex = 0;
    }
    // if not filtering options, set activeIndex to first matching option
    // (or leave it alone, if the active option is already in the matching set)
    else {
      const filterCurrentOption = matches.filter((option) => option.name === this.options[this.activeIndex].name);

      if (matches.length > 0 && !filterCurrentOption.length) {
        this.activeIndex = this.options.indexOf(matches[0]);
      }
    }

    if (this.value !== curValue) {
      this.value = curValue;
    }

    const menuState = this.filteredOptions.length > 0;
    if (this.open !== menuState) {
      this.updateMenuState(menuState, false);
    }
  }

  private onInputKeyDown(event: KeyboardEvent) {
    const max = this.filteredOptions.length - 1;

    const action = getActionFromKey(event, this.open);

    switch(action) {
      case MenuActions.Next:
      case MenuActions.Last:
      case MenuActions.First:
      case MenuActions.Previous:
        event.preventDefault();
        return this.onOptionChange(getUpdatedIndex(this.activeIndex, max, action));
      case MenuActions.CloseSelect:
        event.preventDefault();
        this.selectOption(this.activeIndex);
        return this.updateMenuState(false);
      case MenuActions.Close:
        event.preventDefault();
        this.activeIndex = 0;
        this.value = this.selectedValue;
        this.filteredOptions = this.options;
        return this.updateMenuState(false);
      case MenuActions.Open:
        return this.updateMenuState(true);
    }
  }

  private onInputBlur() {
    if (this.ignoreBlur) {
      this.ignoreBlur = false;
      return;
    }

    if (this.open) {
      this.selectOption(this.activeIndex);
      this.updateMenuState(false, false);
    }
  }

  private onOptionChange(index: number) {
    this.activeIndex = index;
  }

  private onOptionClick(index: number) {
    this.onOptionChange(index);
    this.selectOption(index);
    this.updateMenuState(false);
  }

  private onOptionMouseDown() {
    this.ignoreBlur = true;
  }

  private selectOption(index: number) {
    const selected = this.filteredOptions[index];
    this.value = selected.name;
    this.selectedValue = selected.name;
    this.activeIndex = 0;

    if (this.filter) {
      this.filteredOptions = filterOptions(this.options, this.value);
    }

    this.selectEvent.emit(selected);
  }

  private updateMenuState(open: boolean, callFocus = true) {
    this.open = open;
    callFocus && this.inputRef.focus();
  }
}