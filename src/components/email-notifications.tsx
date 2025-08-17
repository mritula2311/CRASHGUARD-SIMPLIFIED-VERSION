"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, XCircle, Clock, AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { getRecentEmailNotifications, getNotificationStats, clearEmailNotifications } from "@/services/notification-service";
import type { EmailNotification } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";

interface EmailNotificationsProps {
  newNotifications?: EmailNotification[];
  onNotificationsUpdate?: (notifications: EmailNotification[]) => void;
}

export function EmailNotifications({ newNotifications, onNotificationsUpdate }: EmailNotificationsProps) {
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [recentNotifications, notificationStats] = await Promise.all([
        getRecentEmailNotifications(5),
        getNotificationStats()
      ]);
      
      setNotifications(recentNotifications);
      setStats(notificationStats);
      onNotificationsUpdate?.(recentNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (newNotifications && newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 5));
      setStats(prev => ({
        total: prev.total + newNotifications.length,
        sent: prev.sent + newNotifications.filter(n => n.status === 'sent').length,
        failed: prev.failed + newNotifications.filter(n => n.status === 'failed').length,
        pending: prev.pending + newNotifications.filter(n => n.status === 'pending').length
      }));
      
      // Show success alert for sent notifications
      if (newNotifications.some(n => n.status === 'sent')) {
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 5000);
      }
    }
  }, [newNotifications]);

  const getStatusIcon = (status: EmailNotification['status']) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: EmailNotification['status']) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getTypeIcon = (type: EmailNotification['type']) => {
    switch (type) {
      case 'emergency': return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'alert': return <Mail className="h-3 w-3 text-orange-500" />;
      case 'notification': return <Mail className="h-3 w-3 text-blue-500" />;
    }
  };

  const clearAll = async () => {
    await clearEmailNotifications();
    setNotifications([]);
    setStats({ total: 0, sent: 0, failed: 0, pending: 0 });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-500" />
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 border rounded">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success Alert */}
      {showAlert && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Emergency alerts sent successfully to emergency contacts!
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-500" />
            Email Notifications
            <Badge variant="outline" className="ml-auto">
              {stats.total} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-green-50 rounded dark:bg-green-950">
                <div className="font-bold text-green-700 dark:text-green-300">{stats.sent}</div>
                <div className="text-green-600 dark:text-green-400">Sent</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded dark:bg-red-950">
                <div className="font-bold text-red-700 dark:text-red-300">{stats.failed}</div>
                <div className="text-red-600 dark:text-red-400">Failed</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded dark:bg-yellow-950">
                <div className="font-bold text-yellow-700 dark:text-yellow-300">{stats.pending}</div>
                <div className="text-yellow-600 dark:text-yellow-400">Pending</div>
              </div>
            </div>

            {/* Recent Notifications */}
            {notifications.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recent Notifications</span>
                  <div className="flex gap-1">
                    <Button onClick={fetchNotifications} variant="ghost" size="sm">
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                    <Button onClick={clearAll} variant="ghost" size="sm">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-3 border rounded-lg text-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(notification.type)}
                          <span className="font-medium text-xs uppercase tracking-wide">
                            {notification.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(notification.status)}
                          <Badge variant="outline" className={`text-xs ${getStatusColor(notification.status)}`}>
                            {notification.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="font-medium truncate">{notification.subject}</p>
                        <p className="text-xs text-muted-foreground">To: {notification.recipient}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No email notifications yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
