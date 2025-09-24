// Page-world bridge script to intercept window.fetch
(function() {
  'use strict';

  console.log('🔗 Swiggy Tracker page-bridge injected');

  // Store original fetch
  const originalFetch = window.fetch;

  // Override window.fetch to intercept Swiggy API calls
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);

    try {
      // Check if this is a Swiggy order API call
      if (response.url && response.url.includes('swiggy.com/dapi/order/all')) {
        console.log('📡 Intercepted Swiggy order API call:', response.url);

        // Clone the response to read it without consuming the original
        const clonedResponse = response.clone();

        // Read the response data and send it to the content script
        clonedResponse.json().then(data => {
          // Log sample order data to inspect available fields
          if (data?.data?.orders && data.data.orders.length > 0) {
            const sampleOrder = data.data.orders[0];
            console.log('📊 Sample API order data:', {
              order_id: sampleOrder.order_id,
              order_time: sampleOrder.order_time,
              delivery_time: sampleOrder.delivery_time,
              order_placed_time: sampleOrder.order_placed_time,
              estimated_delivery_time: sampleOrder.estimated_delivery_time,
              all_time_fields: Object.keys(sampleOrder).filter(key => key.includes('time') || key.includes('Time'))
            });
          }

          window.postMessage({
            __SWG_EVT: "SWG_API_ORDERS",
            payload: {
              orders: data?.data?.orders || [],
              url: response.url,
              data: data
            }
          }, "*");
        }).catch(error => {
          console.debug('Error reading response data:', error);
        });
      }
    } catch (error) {
      console.debug('Fetch intercept error:', error);
    }

    return response;
  };
})();
