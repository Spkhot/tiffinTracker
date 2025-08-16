// public/sw.js

self.addEventListener('push', e => {
    const data = e.data.json();
    const options = {
        body: data.body,
        icon: '/assets/images/logo.png',
        actions: data.actions,
        data: data.data
    };
    self.registration.showNotification(data.title, options);
});

self.addEventListener('notificationclick', e => {
    e.notification.close();

    const notificationData = e.notification.data;
    const action = e.action; // 'yes' or 'no'

    if (action === 'yes' || action === 'no') {
        const status = (action === 'yes') ? 'taken' : 'skipped';
        
        // This is the new magic!
        // We send the temporary token to our new backend endpoint.
        const updatePromise = fetch('/api/dashboard/update-from-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token: notificationData.token,
                status: status,
                // For now, we handle reason separately. A prompt from a service worker is not possible.
            })
        }).then(res => {
            if (!res.ok) {
                console.error('Failed to update tiffin status from notification.');
            } else {
                console.log('Tiffin status updated from notification click.');
            }
        });

        // Tell the browser to wait until our fetch call is complete
        e.waitUntil(updatePromise);
    }
});