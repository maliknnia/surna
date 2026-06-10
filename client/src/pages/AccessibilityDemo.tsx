// Accessibility Demo Page - Showcase of all implemented accessibility features
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Import all accessibility components
import {
  AccessibilitySettings,
  AccessibilityTester,
  AccessibleButton,
  AccessibleInput,
  AccessibleDialog,
  AccessibleNavigation,
  AccessibleImage,
  AccessibleImageGallery,
  FocusManager,
  ScreenReaderOnly,
  LiveRegion,
  ResponsiveContainer,
  useTouchOptimization,
  useAccessibility
} from "@/components/accessibility";

import { 
  Eye, 
  Keyboard, 
  MousePointer, 
  Monitor, 
  Smartphone, 
  Volume2,
  CheckCircle,
  AlertCircle,
  Heart
} from "lucide-react";

export default function AccessibilityDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [likeCount, setLikeCount] = useState(42);
  const [announcement, setAnnouncement] = useState("");
  const { announce } = useAccessibility();
  const { shouldOptimize, touchTargetSize } = useTouchOptimization();

  const handleLike = () => {
    const newCount = likeCount + 1;
    setLikeCount(newCount);
    setAnnouncement(`Post liked! Total likes: ${newCount}`);
    announce(`Post liked! Total likes: ${newCount}`, 'polite');
  };

  const sampleImages = [
    {
      src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
      alt: "Athletes training on a running track during golden hour",
      caption: "Team training session",
      longDescription: "A group of diverse athletes running on a professional track during sunset, showcasing the dedication and teamwork in sports training."
    },
    {
      src: "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400", 
      alt: "Basketball players in action during a competitive game",
      caption: "Basketball championship",
      longDescription: "Professional basketball players competing intensely, demonstrating athletic skill and competitive spirit during a championship match."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8" data-testid="accessibility-demo">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Accessibility Features Demo
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Comprehensive demonstration of WCAG 2.1 compliant accessibility features 
          implemented throughout the SURNA platform for inclusive user experience.
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-2">
            <CheckCircle className="h-4 w-4 text-token-text" />
            WCAG 2.1 AA Compliant
          </Badge>
          <Badge variant="outline" className="gap-2">
            <Keyboard className="h-4 w-4" />
            Keyboard Navigation
          </Badge>
          <Badge variant="outline" className="gap-2">
            <Volume2 className="h-4 w-4" />
            Screen Reader Support
          </Badge>
          <Badge variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            High Contrast
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Live Region for Announcements */}
      <LiveRegion priority="polite">
        {announcement}
      </LiveRegion>

      {/* Main Demo Content */}
      <Tabs defaultValue="components" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Enhanced Components Tab */}
        <TabsContent value="components" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointer className="h-5 w-5" />
                Enhanced UI Components
              </CardTitle>
              <p className="text-muted-foreground">
                All components include proper ARIA attributes, keyboard navigation, and focus management.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Accessible Buttons */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Accessible Buttons</h3>
                <div className="flex gap-4 flex-wrap">
                  <AccessibleButton
                    variant="default"
                    onClick={handleLike}
                    className="flex items-center gap-2"
                    aria-label={`Like this post. Current likes: ${likeCount}`}
                    touchOptimized={shouldOptimize}
                  >
                    <Heart className={`h-4 w-4 ${likeCount > 42 ? 'fill-current text-token-text' : ''}`} />
                    Like ({likeCount})
                  </AccessibleButton>

                  <AccessibleButton
                    variant="outline"
                    isLoading={false}
                    loadingText="Sharing post..."
                    srOnlyText="Share this post on social media"
                  >
                    Share Post
                  </AccessibleButton>

                  <AccessibleButton
                    variant="secondary"
                    onClick={() => setDialogOpen(true)}
                    aria-haspopup="dialog"
                  >
                    Open Dialog
                  </AccessibleButton>
                </div>
              </div>

              <Separator />

              {/* Accessible Inputs */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Accessible Form Inputs</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <AccessibleInput
                    label="Full Name"
                    placeholder="Enter your full name"
                    description="This will be displayed on your public profile"
                    isRequired
                    touchOptimized={shouldOptimize}
                  />

                  <AccessibleInput
                    label="Bio"
                    placeholder="Tell us about yourself"
                    description="Optional field for additional information"
                    errorMessage=""
                    touchOptimized={shouldOptimize}
                  />

                  <AccessibleInput
                    label="Email"
                    type="email"
                    placeholder="Enter your email"
                    isRequired
                    aria-describedby="email-help"
                  />

                  <AccessibleInput
                    label="Password"
                    type="password"
                    placeholder="Enter secure password"
                    isRequired
                    description="Must be at least 8 characters"
                  />
                </div>
              </div>

              <Separator />

              {/* Focus Management Demo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Focus Management</h3>
                <p className="text-muted-foreground">
                  This container demonstrates focus trapping and automatic focus management.
                </p>
                <FocusManager trapFocus restoreFocus className="p-4 rounded-lg space-y-2">
                  <p className="font-medium">Focus is trapped within this area</p>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-primary text-primary-foreground rounded">
                      Button 1
                    </button>
                    <button className="px-3 py-1 bg-secondary text-secondary-foreground rounded">
                      Button 2
                    </button>
                    <button className="px-3 py-1 bg-accent text-accent-foreground rounded">
                      Button 3
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Text input within focus trap" 
                    className="w-full px-3 py-1 rounded"
                  />
                </FocusManager>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Navigation Tab */}
        <TabsContent value="navigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Accessible Navigation
              </CardTitle>
              <p className="text-muted-foreground">
                Navigation with full keyboard support, ARIA labels, and responsive design.
              </p>
            </CardHeader>
            <CardContent>
              <AccessibleNavigation
                items={[
                  { href: '/feed', label: 'Feed', isActive: false },
                  { href: '/teams', label: 'Teams', isActive: false },
                  { href: '/events', label: 'Events', isActive: false },
                  { 
                    href: '/more', 
                    label: 'More', 
                    isActive: false,
                    subItems: [
                      { href: '/coaches', label: 'Coaches', isActive: false },
                      { href: '/marketplace', label: 'Marketplace', isActive: false },
                      { href: '/analytics', label: 'Analytics', isActive: false }
                    ]
                  }
                ]}
                brand={
                  <span className="text-xl font-bold">SURNA</span>
                }
                skipLinkHref="#main-content"
                aria-label="Demo navigation"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Accessible Media
              </CardTitle>
              <p className="text-muted-foreground">
                Images with proper alt text, captions, and zoom functionality.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Single Accessible Image */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Enhanced Image</h3>
                <AccessibleImage
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600"
                  alt="Group of diverse athletes training together on a professional running track"
                  caption="Team training session during golden hour"
                  longDescription="A diverse group of athletes of different ages and backgrounds are training together on a professional running track. The image captures the essence of teamwork and dedication in sports, with warm golden hour lighting creating an inspiring atmosphere."
                  zoomable
                  className="max-w-md mx-auto"
                />
              </div>

              <Separator />

              {/* Image Gallery */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Accessible Gallery</h3>
                <AccessibleImageGallery
                  images={sampleImages}
                  className="max-w-lg mx-auto"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Accessibility Testing
              </CardTitle>
              <p className="text-muted-foreground">
                Built-in accessibility auditing and testing tools.
              </p>
            </CardHeader>
            <CardContent>
              <AccessibilityTester
                targetSelector="[data-testid='accessibility-demo']"
                autoRun={false}
                showResults={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <AccessibilitySettings />
        </TabsContent>
      </Tabs>

      {/* Demo Dialog */}
      <AccessibleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Accessible Dialog Example"
        description="This dialog demonstrates proper focus management, keyboard navigation, and screen reader support."
        closeOnEscape={true}
        closeOnOverlayClick={true}
        announceOnOpen="Dialog opened"
        announceOnClose="Dialog closed"
      >
        <div className="space-y-4">
          <p>
            This is an example of an accessible dialog. It includes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Proper ARIA attributes and roles</li>
            <li>Focus trapping within the dialog</li>
            <li>Keyboard navigation support (Tab, Shift+Tab, Escape)</li>
            <li>Screen reader announcements</li>
            <li>Focus restoration when closed</li>
          </ul>
          
          <div className="flex justify-end gap-2">
            <AccessibleButton
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </AccessibleButton>
            <AccessibleButton
              onClick={() => {
                setDialogOpen(false);
                announce('Dialog action completed', 'polite');
              }}
            >
              Confirm
            </AccessibleButton>
          </div>
        </div>
      </AccessibleDialog>

      {/* Screen Reader Instructions */}
      <ScreenReaderOnly>
        <div>
          <h2>Screen Reader Instructions</h2>
          <p>
            This page demonstrates various accessibility features. Use Tab to navigate between 
            interactive elements, arrow keys to navigate tabs and dropdown menus, and Enter 
            or Space to activate buttons and links. All images include descriptive alt text 
            and detailed descriptions are available for complex images.
          </p>
        </div>
      </ScreenReaderOnly>

      {/* Responsive Breakpoint Demo */}
      <ResponsiveContainer breakpoint="md" direction="up">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Smartphone className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                This content is visible on medium screens and larger. 
                The touch optimization is {shouldOptimize ? 'enabled' : 'disabled'} 
                with touch targets sized at {touchTargetSize}px.
              </p>
            </div>
          </CardContent>
        </Card>
      </ResponsiveContainer>
    </div>
  );
}