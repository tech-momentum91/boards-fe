import React, { useState, useEffect, forwardRef } from 'react';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { COUNTRIES, DEFAULT_COUNTRY_CODE, parseContactNumber } from '@/constants/countries';
import { cn } from '@/lib/utils';

/**
 * PhoneInput Component
 * A reusable phone number input with country code selector
 *
 * @param {Object} props
 * @param {string} props.countryCode - Initial country code (default: '+91')
 * @param {string} props.value - Current phone number value
 * @param {Function} props.onChange - Callback when value changes (receives { countryCode, number, formattedValue })
 * @param {Function} props.onCountryCodeChange - Callback when country code changes
 * @param {string} props.placeholder - Placeholder text for phone input
 * @param {boolean} props.disabled - Whether the input is disabled
 * @param {boolean} props.hasError - Whether to show error state
 * @param {string} props.size - Input size: 'large' | 'medium' | 'small' | 'xsmall' (large uses responsive height/typography)
 * @param {string} props.variant - Input variant: 'default' | 'borderless' | 'underline'
 * @param {number} props.maxLength - Maximum length for phone number (default: 10)
 * @param {boolean} props.allowNumericOnly - Whether to allow only numeric input (default: true)
 * @param {string} props.countryFlagCode - Optional ISO 3166-1 alpha-2 flag code (e.g. 'us', 'ca') when the dial code is shared (+1)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.inputProps - Additional props to pass to the input element
 */
const PhoneInput = forwardRef(
  (
    {
      countryCode: controlledCountryCode,
      countryFlagCode: controlledCountryFlagCode,
      value: controlledValue = '',
      onChange,
      onCountryCodeChange,
      placeholder = 'Enter phone number',
      disabled = false,
      hasError = false,
      size = 'medium',
      variant = 'default',
      maxLength = 10,
      allowNumericOnly = true,
      className,
      inputProps = {},
      ...rest
    },
    ref,
  ) => {
    const resolveCountryKeyForDial = (dial, flagCode) => {
      const matches = COUNTRIES.filter((c) => c.value === dial);
      if (matches.length === 1) return matches[0].uniqueKey;
      if (matches.length > 1 && flagCode) {
        const byFlag = matches.find((c) => c.flagCode === flagCode);
        if (byFlag) return byFlag.uniqueKey;
      }
      return '';
    };

    const [internalCountryCode, setInternalCountryCode] = useState(
      controlledCountryCode || DEFAULT_COUNTRY_CODE,
    );
    const [internalValue, setInternalValue] = useState(controlledValue || '');
    const [selectedCountryKey, setSelectedCountryKey] = useState(() => {
      const initialCc =
        controlledCountryCode !== undefined ? controlledCountryCode : DEFAULT_COUNTRY_CODE;
      const flag = controlledCountryFlagCode !== undefined ? controlledCountryFlagCode : undefined;
      return resolveCountryKeyForDial(initialCc, flag);
    });

    // Use controlled values if provided, otherwise use internal state
    const countryCode =
      controlledCountryCode === undefined ? internalCountryCode : controlledCountryCode;
    const value = controlledValue === undefined ? internalValue : controlledValue;

    // Keep Radix Select in sync when dial code changes. Shared dial codes (+1, etc.) must not
    // snap to the first alphabetical country (e.g. Canada vs United States) — align with Frappe's per-country ISO flag code.
    useEffect(() => {
      const matches = COUNTRIES.filter((c) => c.value === countryCode);
      if (matches.length === 0) return;
      if (matches.length === 1) {
        setSelectedCountryKey(matches[0].uniqueKey);
        return;
      }
      setSelectedCountryKey((prev) => {
        if (prev && matches.some((m) => m.uniqueKey === prev)) {
          return prev;
        }
        if (controlledCountryFlagCode) {
          const byFlag = matches.find((m) => m.flagCode === controlledCountryFlagCode);
          if (byFlag) return byFlag.uniqueKey;
        }
        return prev;
      });
    }, [countryCode, controlledCountryFlagCode]);

    // Update internal state when controlled values change
    useEffect(() => {
      if (controlledCountryCode !== undefined) {
        setInternalCountryCode(controlledCountryCode);
      }
    }, [controlledCountryCode]);

    useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(controlledValue);
      }
    }, [controlledValue]);

    const handleCountryCodeChange = (newCountryKey) => {
      const selectedCountry = COUNTRIES.find((c) => c.uniqueKey === newCountryKey);
      if (!selectedCountry) return;

      const newCountryCode = selectedCountry.value;
      setSelectedCountryKey(newCountryKey);

      if (controlledCountryCode === undefined) {
        setInternalCountryCode(newCountryCode);
      }
      onCountryCodeChange?.(newCountryCode, {
        uniqueKey: newCountryKey,
        flagCode: selectedCountry.flagCode,
        label: selectedCountry.label,
      });

      const currentNumber = value || '';

      if (currentNumber) {
        const newFormattedValue = `${newCountryCode}-${currentNumber}`;
        onChange?.({
          countryCode: newCountryCode,
          number: currentNumber,
          formattedValue: newFormattedValue,
        });
      }
    };

    const handlePhoneNumberChange = (e) => {
      let newValue = e.target.value;

      if (allowNumericOnly) {
        newValue = [...newValue].filter((char) => /\d/.test(char)).join('');
      }

      newValue = newValue.slice(0, maxLength);

      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }

      const formattedValue = newValue ? `${countryCode}-${newValue}` : '';
      onChange?.({
        countryCode,
        number: newValue,
        formattedValue,
        event: e,
      });
    };

    const dialMatches = COUNTRIES.filter((c) => c.value === countryCode);

    let selectedCountry =
      (selectedCountryKey && COUNTRIES.find((c) => c.uniqueKey === selectedCountryKey)) ||
      (dialMatches.length === 1 ? dialMatches[0] : null) ||
      (controlledCountryFlagCode &&
        dialMatches.find((c) => c.flagCode === controlledCountryFlagCode));

    if (!selectedCountry) {
      if (dialMatches.length > 1) {
        // Shared NANP +1 / other duplicates: never infer flag from alphabetical first match.
        selectedCountry = { ...dialMatches[0], flag: null };
      } else {
        selectedCountry =
          dialMatches[0] || COUNTRIES.find((c) => c.value === DEFAULT_COUNTRY_CODE) || COUNTRIES[0];
      }
    }

    selectedCountry = selectedCountry || {
      value: countryCode,
      label: countryCode,
      flag: 'https://flagcdn.com/xx.svg',
      flagCode: 'xx',
      uniqueKey: countryCode,
    };

    const rootRounded = size === 'small' || size === 'xsmall' ? 'rounded-lg' : 'rounded-[10px]';
    const isBorderless = variant === 'borderless';
    const isUnderline = variant === 'underline';
    const isMinimalChrome = isBorderless || isUnderline;

    return (
      <div
        className={cn(
          'flex w-full bg-bg-white-0 transition duration-200 ease-out',
          isUnderline ? 'overflow-visible rounded-none' : 'overflow-hidden',
          !isMinimalChrome && rootRounded,
          !isMinimalChrome && 'border border-stroke-soft-200 shadow-regular-xs',
          !isMinimalChrome &&
            !hasError &&
            'focus-within:border-primary-base focus-within:shadow-button-important-focus',
          hasError &&
            !isMinimalChrome &&
            'border-error-base focus-within:border-error-base focus-within:shadow-button-error-focus',
          className,
        )}
      >
        <Input.Root
          size={size}
          variant={variant}
          hasError={hasError}
          noRing
          className='w-full flex !shadow-none border-0 rounded-none min-h-0 !divide-x-0'
          {...rest}
        >
          <Select.Root
            size={size}
            variant='compactForInput'
            value={selectedCountry?.uniqueKey || selectedCountryKey}
            onValueChange={handleCountryCodeChange}
            disabled={disabled}
            matchTriggerWidth={false}
          >
            <Select.Trigger
              className={cn(
                'shrink-0 self-stretch border-r border-stroke-soft-200 rounded-none',
                size === 'large' && 'min-h-8 md:min-h-12',
                variant === 'borderless' && 'pl-1',
                isUnderline && 'hover:bg-transparent',
              )}
            >
              <Select.Value asChild>
                <span
                  className={cn('flex items-center gap-1', size === 'large' && 'gap-1.5 md:gap-2')}
                >
                  {selectedCountry?.flag ? (
                    <img
                      src={selectedCountry.flag}
                      alt={selectedCountry.label || countryCode}
                      className={cn(
                        'object-cover rounded-full',
                        size === 'large' ? 'size-5 md:size-6' : 'size-5',
                      )}
                    />
                  ) : (
                    <span>🌍</span>
                  )}
                  <span>{countryCode}</span>
                </span>
              </Select.Value>
            </Select.Trigger>
            <Select.Content className='min-w-[120px] p-0 gap-0'>
              {COUNTRIES.map((country, index) => (
                <Select.Item
                  className='flex whitespace-nowrap items-center gap-2'
                  key={country.uniqueKey || `country-${index}`}
                  value={country.uniqueKey}
                >
                  <Select.ItemIcon
                    className={`shrink-0 ${size === 'large' ? 'size-5 md:size-6' : 'size-5'}`}
                  >
                    {country.flag ? (
                      <img
                        src={country.flag}
                        alt={country.label}
                        className={cn(
                          'object-cover rounded-full shrink-0',
                          size === 'large' ? 'size-5 md:size-6' : 'size-5',
                        )}
                        loading='lazy'
                      />
                    ) : (
                      <span>🌍</span>
                    )}
                  </Select.ItemIcon>
                  <span className='flex-1'>
                    {country.label} {country.value}
                  </span>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Input.Wrapper className='flex-1 min-w-0 rounded-none pl-0'>
            <Input.Input
              ref={ref}
              type='tel'
              placeholder={placeholder}
              value={value}
              onChange={handlePhoneNumberChange}
              onInput={handlePhoneNumberChange}
              disabled={disabled}
              maxLength={maxLength}
              inputMode='numeric'
              {...inputProps}
            />
          </Input.Wrapper>
        </Input.Root>
      </div>
    );
  },
);

PhoneInput.displayName = 'PhoneInput';

/**
 * PhoneInputController - Wrapper for use with react-hook-form Controller
 *
 * Usage with react-hook-form:
 *
 * <Controller
 *   name="phone"
 *   control={control}
 *   render={({ field, fieldState }) => (
 *     <PhoneInputController
 *       value={field.value}
 *       onChange={(data) => {
 *         // data is { countryCode, number, formattedValue }
 *         field.onChange(data.formattedValue);
 *       }}
 *       error={fieldState.error}
 *     />
 *   )}
 * />
 */
export const PhoneInputController = ({
  value,
  onChange,
  error,
  countryCode: initialCountryCode,
  countryFlagCode: initialCountryFlagCode,
  onCountryCodeChange,
  ...props
}) => {
  const [countryCode, setCountryCode] = useState(initialCountryCode || DEFAULT_COUNTRY_CODE);
  const [countryFlagCode, setCountryFlagCode] = useState(initialCountryFlagCode);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [lastFormattedValue, setLastFormattedValue] = useState('');

  useEffect(() => {
    if (value === lastFormattedValue) {
      return;
    }

    if (!value) {
      if (lastFormattedValue !== undefined && lastFormattedValue !== '') {
        setPhoneNumber('');
        setLastFormattedValue('');
      }
      return;
    }

    if (typeof value === 'string' && value.includes('-')) {
      const parsed = parseContactNumber(value, COUNTRIES);
      setCountryCode(parsed.countryCode);
      setPhoneNumber(parsed.number);
      setLastFormattedValue(value);
      const dialMatches = COUNTRIES.filter((c) => c.value === parsed.countryCode);
      if (dialMatches.length === 1) {
        setCountryFlagCode(dialMatches[0].flagCode);
      } else {
        setCountryFlagCode(undefined);
      }
    } else if (typeof value === 'string') {
      setPhoneNumber(value);
    }
  }, [value]);

  useEffect(() => {
    if (initialCountryCode && !value) {
      setCountryCode(initialCountryCode);
    }
  }, [initialCountryCode, value]);

  useEffect(() => {
    if (initialCountryFlagCode !== undefined) {
      setCountryFlagCode(initialCountryFlagCode);
    }
  }, [initialCountryFlagCode]);

  const handleChange = (data) => {
    let number = '';
    let formattedValue = '';

    if (data && typeof data === 'object' && 'formattedValue' in data) {
      number = data.number || '';
      formattedValue = data.formattedValue || '';
    } else if (typeof data === 'string') {
      formattedValue = data;
      if (formattedValue.includes('-')) {
        const parts = formattedValue.split('-');
        number = parts[1] || '';
      } else {
        number = formattedValue;
      }
    }

    setPhoneNumber(number);
    setLastFormattedValue(formattedValue);
    onChange?.(formattedValue);
  };

  const handleCountryCodeChange = (newCountryCode, meta) => {
    setCountryCode(newCountryCode);
    const dialMatches = COUNTRIES.filter((c) => c.value === newCountryCode);
    if (meta?.flagCode) {
      setCountryFlagCode(meta.flagCode);
    } else if (dialMatches.length === 1) {
      setCountryFlagCode(dialMatches[0].flagCode);
    } else {
      setCountryFlagCode(undefined);
    }
    onCountryCodeChange?.(newCountryCode, meta);

    const currentNumber = phoneNumber || '';

    if (currentNumber) {
      const newFormattedValue = `${newCountryCode}-${currentNumber}`;
      setLastFormattedValue(newFormattedValue);
      onChange?.(newFormattedValue);
    } else {
      setLastFormattedValue('');
    }
  };

  return (
    <PhoneInput
      countryCode={countryCode}
      countryFlagCode={countryFlagCode}
      value={phoneNumber}
      onChange={handleChange}
      onCountryCodeChange={handleCountryCodeChange}
      hasError={Boolean(error)}
      {...props}
    />
  );
};

PhoneInputController.displayName = 'PhoneInputController';

export default PhoneInput;
