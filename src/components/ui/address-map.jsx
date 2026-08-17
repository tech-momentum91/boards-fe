import React, { useRef, useState, useEffect, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, Autocomplete } from '@react-google-maps/api';
import * as Input from '@/components/ui/input';
import { RiMapPinLine } from 'react-icons/ri';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // Center of India
const libraries = ['places'];

const AddressMap = ({
  address = '',
  /** When set (e.g. from saved Google Places data), marker uses these coords instead of geocoding `address`. */
  coordinates = null,
  onAddressChange,
  onCoordinatesChange,
  disabled = false,
  showInput = true,
}) => {
  const autocompleteRef = useRef(null);
  const markerRef = useRef(null);
  const lastGeocodedAddressRef = useRef('');
  const geocodeTimeoutRef = useRef(null);

  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [position, setPosition] = useState(null);
  const [searchInput, setSearchInput] = useState(address);

  // Update search input when address prop changes
  useEffect(() => {
    setSearchInput(address);
  }, [address]);

  // Geocode address when address prop changes to show marker (with debouncing and caching).
  // Prefer `coordinates` when provided so POI pins stay exact (formatted_address alone often geocodes to locality).
  useEffect(() => {
    // Clear any pending geocode calls
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    if (coordinates?.lat != null && coordinates?.lng != null) {
      const lat = Number(coordinates.lat);
      const lng = Number(coordinates.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        setPosition({ lat, lng });
        setMapCenter({ lat, lng });
        lastGeocodedAddressRef.current = (address || '').trim();
        return;
      }
    }

    if (!address || address.trim() === '') {
      setPosition(null);
      lastGeocodedAddressRef.current = '';
      return;
    }

    // Skip if we already geocoded this exact address
    if (lastGeocodedAddressRef.current === address.trim()) {
      return;
    }

    // Debounce geocoding to prevent excessive API calls
    geocodeTimeoutRef.current = setTimeout(() => {
      // Double-check address hasn't changed during debounce
      if (lastGeocodedAddressRef.current === address.trim()) {
        return;
      }

      // Wait for Google Maps to load before geocoding
      const geocodeAddress = () => {
        if (window.google && window.google.maps && window.google.maps.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ address: address.trim() }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const { location } = results[0].geometry;
              const lat = location.lat();
              const lng = location.lng();

              setPosition({ lat, lng });
              setMapCenter({ lat, lng });
              lastGeocodedAddressRef.current = address.trim();

              // Notify parent about coordinates (only once)
              if (onCoordinatesChange) {
                onCoordinatesChange({ lat, lng });
              }
            }
          });
        }
      };

      // Check if Google Maps is loaded, if not wait a bit
      if (window.google && window.google.maps) {
        geocodeAddress();
      } else {
        // Wait for Google Maps to load
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkInterval);
            geocodeAddress();
          }
        }, 100);

        // Clear interval after 5 seconds to avoid infinite waiting
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    }, 500); // 500ms debounce

    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [address, coordinates]); // Removed onCoordinatesChange from dependencies to prevent re-triggering

  // Called when user selects address from autocomplete
  const onPlaceChanged = useCallback(() => {
    // Prevent any event bubbling that might close the drawer
    if (window.event) {
      window.event.stopPropagation();
      window.event.stopImmediatePropagation();
    }

    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();
    if (!place.geometry) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const formattedAddress = place.formatted_address;

    setMapCenter({ lat, lng });
    setPosition({ lat, lng });
    setSearchInput(formattedAddress);

    // Update the last geocoded address to prevent re-geocoding
    lastGeocodedAddressRef.current = formattedAddress.trim();

    // Use setTimeout to ensure state updates don't trigger drawer close
    setTimeout(() => {
      const coordPayload = { lat, lng };
      // Notify parent components (second arg: coords for single-save flows)
      if (onAddressChange) {
        onAddressChange(formattedAddress, coordPayload);
      }
      if (onCoordinatesChange) {
        onCoordinatesChange(coordPayload);
      }
    }, 0);
  }, [onAddressChange, onCoordinatesChange]);

  // Called when marker is dragged
  const onMarkerDragEnd = useCallback(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const markerPosition = marker.getPosition();
    if (!markerPosition) return;

    const lat = markerPosition.lat();
    const lng = markerPosition.lng();

    setPosition({ lat, lng });
    setMapCenter({ lat, lng });

    // Reverse geocoding to get address from coordinates
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const formattedAddress = results[0].formatted_address;
        setSearchInput(formattedAddress);

        // Update the last geocoded address to prevent re-geocoding
        lastGeocodedAddressRef.current = formattedAddress.trim();

        const coordPayload = { lat, lng };
        if (onAddressChange) {
          onAddressChange(formattedAddress, coordPayload);
        }
        if (onCoordinatesChange) {
          onCoordinatesChange(coordPayload);
        }
      }
    });
  }, [onAddressChange, onCoordinatesChange]);

  // Ensure pac-container is always clickable and prevent event bubbling
  useEffect(() => {
    const stopAllPropagation = (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Global handler to catch clicks on pac-container and pac-items
    const globalClickHandler = (e) => {
      const { target } = e;
      const isPacElement =
        target.closest('.pac-container') ||
        target.closest('.pac-item') ||
        target.classList.contains('pac-container') ||
        target.classList.contains('pac-item') ||
        target.classList.contains('pac-item-query') ||
        target.classList.contains('pac-matched');

      if (isPacElement) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // Add global listener in capture phase
    document.addEventListener('pointerdown', globalClickHandler, true);
    document.addEventListener('click', globalClickHandler, true);
    document.addEventListener('mousedown', globalClickHandler, true);
    document.addEventListener('mouseup', globalClickHandler, true);
    document.addEventListener('touchstart', globalClickHandler, true);
    document.addEventListener('touchend', globalClickHandler, true);

    const ensurePacContainerClickable = () => {
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach((container) => {
        container.style.zIndex = '10000';
        container.style.pointerEvents = 'auto';
        container.style.position = 'absolute';

        // Mark as inside dialog to prevent Radix from treating it as outside click
        container.setAttribute('data-radix-popper-content-wrapper', '');
        container.setAttribute('data-ignore-outside-click', 'true');

        // Remove all existing listeners first
        const events = ['pointerdown', 'click', 'mousedown', 'mouseup', 'touchstart', 'touchend'];
        events.forEach((eventType) => {
          container.removeEventListener(eventType, stopAllPropagation, true);
          container.removeEventListener(eventType, stopAllPropagation, false);
        });

        // Add new listeners in capture phase to catch events early
        events.forEach((eventType) => {
          container.addEventListener(eventType, stopAllPropagation, true);
        });
      });

      // Also prevent propagation on pac-items and all child elements
      const pacItems = document.querySelectorAll('.pac-item, .pac-item *');
      pacItems.forEach((item) => {
        // Mark as inside dialog
        item.setAttribute('data-ignore-outside-click', 'true');

        const events = ['pointerdown', 'click', 'mousedown', 'mouseup', 'touchstart', 'touchend'];
        events.forEach((eventType) => {
          item.removeEventListener(eventType, stopAllPropagation, true);
          item.removeEventListener(eventType, stopAllPropagation, false);
          item.addEventListener(eventType, stopAllPropagation, true);
        });
      });
    };

    // Run immediately and set up mutation observer
    ensurePacContainerClickable();

    // Also run after a short delay to catch any late-rendered elements
    const timeoutId = setTimeout(ensurePacContainerClickable, 100);

    const observer = new MutationObserver(() => {
      ensurePacContainerClickable();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      // Remove global listeners
      document.removeEventListener('pointerdown', globalClickHandler, true);
      document.removeEventListener('click', globalClickHandler, true);
      document.removeEventListener('mousedown', globalClickHandler, true);
      document.removeEventListener('mouseup', globalClickHandler, true);
      document.removeEventListener('touchstart', globalClickHandler, true);
      document.removeEventListener('touchend', globalClickHandler, true);
    };
  }, []);

  const stopPropagation = useCallback((e) => {
    if (e) {
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }, []);

  return (
    <div className='w-full space-y-3'>
      <LoadScript googleMapsApiKey={import.meta.env.VITE_API_GOOGLE_MAP} libraries={libraries}>
        {showInput && (
          <div
            className='relative'
            style={{ zIndex: 10000 }}
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
            onMouseUp={stopPropagation}
          >
            <Autocomplete
              onLoad={(ref) => {
                autocompleteRef.current = ref;
              }}
              onPlaceChanged={onPlaceChanged}
              options={{
                fields: ['formatted_address', 'geometry', 'name', 'place_id'],
              }}
            >
              <div
                style={{ position: 'relative', zIndex: 10000 }}
                onClick={stopPropagation}
                onMouseDown={stopPropagation}
                onMouseUp={stopPropagation}
              >
                <Input.Root size='small' className='w-full'>
                  <Input.Wrapper>
                    <Input.Icon>
                      <RiMapPinLine />
                    </Input.Icon>
                    <Input.Input
                      type='text'
                      placeholder='Search address on map...'
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      disabled={disabled}
                      autoComplete='off'
                      onClick={stopPropagation}
                      onMouseDown={stopPropagation}
                      onMouseUp={stopPropagation}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
            </Autocomplete>
          </div>
        )}

        <div
          className='w-full rounded-xl overflow-hidden border border-stroke-soft-200'
          style={{ position: 'relative', zIndex: 1 }}
        >
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={mapCenter}
            zoom={position ? 18 : 5}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {position && (
              <Marker
                position={position}
                draggable={!disabled}
                onLoad={(marker) => (markerRef.current = marker)}
                onDragEnd={onMarkerDragEnd}
              />
            )}
          </GoogleMap>
        </div>
      </LoadScript>
    </div>
  );
};

export default AddressMap;
