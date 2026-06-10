// Promotion Banner Component - Display in-app promotions and announcements
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Gift, Star, Zap, Megaphone, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: 'banner' | 'popup' | 'toast' | 'feature_highlight';
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
  dismissible: boolean;
  priority: number;
}

interface PromotionBannerProps {
  type?: 'banner' | 'popup' | 'toast';
  position?: 'top' | 'bottom' | 'center';
  maxPromotions?: number;
}

export function PromotionBanner({ 
  type = 'banner', 
  position = 'top',
  maxPromotions = 3 
}: PromotionBannerProps) {
  const [dismissedPromotions, setDismissedPromotions] = useState<Set<string>>(new Set());

  // Get active promotions
  const { data: promotions = [] } = useQuery<Promotion[]>({
    queryKey: ['/api/promotions/active'],
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Track promotion view
  const trackViewMutation = useMutation({
    mutationFn: async (promotionId: string) => {
      return apiRequest('POST', '/api/promotions/view', { promotionId });
    },
  });

  // Track promotion click
  const trackClickMutation = useMutation({
    mutationFn: async (promotionId: string) => {
      return apiRequest('POST', '/api/promotions/click', { promotionId });
    },
  });

  // Track promotion dismissal
  const trackDismissMutation = useMutation({
    mutationFn: async (promotionId: string) => {
      return apiRequest('POST', '/api/promotions/dismiss', { promotionId });
    },
  });

  // Filter and sort promotions
  const visiblePromotions = promotions
    .filter(promotion => 
      promotion.type === type && 
      !dismissedPromotions.has(promotion.id)
    )
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxPromotions);

  // Track views when promotions become visible
  useEffect(() => {
    visiblePromotions.forEach(promotion => {
      trackViewMutation.mutate(promotion.id);
    });
  }, [visiblePromotions.map(p => p.id).join(',')]);

  const handlePromotionClick = (promotion: Promotion) => {
    trackClickMutation.mutate(promotion.id);
    
    if (promotion.actionUrl) {
      if (promotion.actionUrl.startsWith('http')) {
        window.open(promotion.actionUrl, '_blank');
      } else {
        window.location.href = promotion.actionUrl;
      }
    }
  };

  const handleDismiss = (promotionId: string) => {
    setDismissedPromotions(prev => new Set([...Array.from(prev), promotionId]));
    trackDismissMutation.mutate(promotionId);
  };

  const getPromotionIcon = (promotion: Promotion) => {
    // You could customize icons based on promotion content
    if (promotion.title.toLowerCase().includes('reward')) return <Gift className="h-5 w-5" />;
    if (promotion.title.toLowerCase().includes('feature')) return <Zap className="h-5 w-5" />;
    if (promotion.title.toLowerCase().includes('premium')) return <Star className="h-5 w-5" />;
    return <Megaphone className="h-5 w-5" />;
  };

  if (visiblePromotions.length === 0) {
    return null;
  }

  // Banner style (horizontal, less intrusive)
  if (type === 'banner') {
    return (
      <div className={`w-full ${position === 'top' ? 'mb-4' : 'mt-4'}`}>
        {visiblePromotions.map((promotion) => (
          <Alert 
            key={promotion.id} 
            className="mb-2 bg-gradient-to-r from-[#2a2535] to-[#2a2535]"
            data-testid={`promotion-banner-${promotion.id}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {getPromotionIcon(promotion)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-token-text">{promotion.title}</h4>
                    <Badge variant="secondary" className="text-xs">New</Badge>
                  </div>
                  <AlertDescription className="text-token-text">
                    {promotion.description}
                  </AlertDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {promotion.actionText && (
                  <Button
                    onClick={() => handlePromotionClick(promotion)}
                    size="sm"
                    data-testid={`button-promotion-action-${promotion.id}`}
                  >
                    {promotion.actionText}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
                
                {promotion.dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(promotion.id)}
                    className="h-8 w-8 p-0"
                    data-testid={`button-dismiss-${promotion.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </Alert>
        ))}
      </div>
    );
  }

  // Toast style (small, bottom corner)
  if (type === 'toast') {
    return (
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {visiblePromotions.map((promotion) => (
          <Card 
            key={promotion.id} 
            className="w-80 shadow-lg bg-transparent border border-border"
            data-testid={`promotion-toast-${promotion.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getPromotionIcon(promotion)}
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{promotion.title}</h4>
                    <p className="text-xs text-token-text mb-2">{promotion.description}</p>
                    
                    {promotion.actionText && (
                      <Button
                        onClick={() => handlePromotionClick(promotion)}
                        size="sm"
                        className="text-xs h-7"
                        data-testid={`button-toast-action-${promotion.id}`}
                      >
                        {promotion.actionText}
                      </Button>
                    )}
                  </div>
                </div>
                
                {promotion.dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(promotion.id)}
                    className="h-6 w-6 p-0"
                    data-testid={`button-toast-dismiss-${promotion.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Popup style (modal overlay)
  if (type === 'popup') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background bg-opacity-50">
        {visiblePromotions.slice(0, 1).map((promotion) => (
          <Card 
            key={promotion.id} 
            className="w-full max-w-md mx-4 shadow-xl"
            data-testid={`promotion-popup-${promotion.id}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getPromotionIcon(promotion)}
                  <h3 className="text-lg font-bold">{promotion.title}</h3>
                </div>
                
                {promotion.dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(promotion.id)}
                    className="h-8 w-8 p-0"
                    data-testid={`button-popup-dismiss-${promotion.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {promotion.imageUrl && (
                <img
                  src={promotion.imageUrl}
                  alt={promotion.title}
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
              )}
              
              <p className="text-token-text mb-6">{promotion.description}</p>
              
              <div className="flex gap-3">
                {promotion.actionText && (
                  <Button
                    onClick={() => handlePromotionClick(promotion)}
                    className="flex-1"
                    data-testid={`button-popup-action-${promotion.id}`}
                  >
                    {promotion.actionText}
                  </Button>
                )}
                
                {promotion.dismissible && (
                  <Button
                    variant="outline"
                    onClick={() => handleDismiss(promotion.id)}
                    data-testid={`button-popup-later-${promotion.id}`}
                  >
                    Maybe Later
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return null;
}