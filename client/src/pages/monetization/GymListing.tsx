import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { invalidateMyHubQueries } from "@/lib/hubQueries";
import { ROUTES } from "@/navigation";
import {
  CreateMediaSection,
  type CreateMediaValue,
} from "@/components/create/CreateMediaSection";
import { 
  ArrowLeft, 
  Building2, 
  DollarSign, 
  Clock, 
  Users, 
  MapPin,
  TrendingUp,
  CheckCircle,
  Star,
} from "lucide-react";

export default function GymListing() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);
  const [coverMedia, setCoverMedia] = useState<CreateMediaValue>(null);
  const [profileMedia, setProfileMedia] = useState<CreateMediaValue>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    // Basic Info
    facilityName: "",
    businessName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    
    // Facility Details
    facilityType: "",
    totalSquareFootage: "",
    maxCapacity: "",
    parkingSpots: "",
    publicTransport: false,
    
    // Equipment & Amenities
    cardioEquipment: [] as string[],
    strengthEquipment: [] as string[],
    specialtyEquipment: [] as string[],
    amenities: [] as string[],
    
    // Pricing & Availability
    hourlyRate: "",
    dailyRate: "",
    monthlyRate: "",
    peakHourSurcharge: "",
    operatingHours: {
      monday: { open: "", close: "", closed: false },
      tuesday: { open: "", close: "", closed: false },
      wednesday: { open: "", close: "", closed: false },
      thursday: { open: "", close: "", closed: false },
      friday: { open: "", close: "", closed: false },
      saturday: { open: "", close: "", closed: false },
      sunday: { open: "", close: "", closed: false }
    },
    
    // Policies & Rules
    minimumAge: "",
    dresscode: "",
    policies: "",
    cancellationPolicy: "",
    virtualTour: "",
    
    // Business Info
    businessLicense: "",
    insurance: "",
    yearsInBusiness: "",
    ownerExperience: "",
    
    // Marketing
    specialOffers: "",
    uniqueSellingPoints: "",
    targetMarket: "",
    
    // Agreements
    termsAccepted: false,
    liabilityInsurance: false,
    backgroundCheck: false
  });

  const facilityTypes = [
    "Full Service Gym", "CrossFit Box", "Yoga Studio", "Martial Arts Dojo",
    "Dance Studio", "Boxing Gym", "Rock Climbing Gym", "Swimming Pool",
    "Tennis Court", "Basketball Court", "Soccer Field", "Multi-Sport Complex"
  ];

  const cardioOptions = [
    "Treadmills", "Ellipticals", "Stationary Bikes", "Rowing Machines", 
    "Stair Climbers", "Arc Trainers"
  ];

  const strengthOptions = [
    "Free Weights", "Weight Machines", "Power Racks", "Olympic Platforms",
    "Resistance Bands", "Kettlebells", "Medicine Balls"
  ];

  const amenitiesOptions = [
    "Locker Rooms", "Showers", "Sauna", "Steam Room", "Juice Bar",
    "Pro Shop", "Child Care", "Personal Training", "Group Classes",
    "Wifi", "Parking", "Air Conditioning", "Sound System"
  ];

  const earningPotentials = {
    "Full Service Gym": { hourly: "€200-500", daily: "€1500-4000", monthly: "€30000-80000" },
    "CrossFit Box": { hourly: "€150-300", daily: "€1000-2500", monthly: "€15000-40000" },
    "Yoga Studio": { hourly: "€80-200", daily: "€500-1500", monthly: "€8000-25000" },
    "Dance Studio": { hourly: "€100-250", daily: "€700-2000", monthly: "€10000-30000" }
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      const addressQuery = [formData.address, formData.city, formData.state, formData.zipCode]
        .filter(Boolean)
        .join(", ");
      let latitude: string | undefined;
      let longitude: string | undefined;
      if (addressQuery.trim()) {
        try {
          const geoRes = await apiRequest("POST", "/api/location/geocode", { address: addressQuery });
          const geo = (await geoRes.json()) as { lat?: number; lng?: number };
          if (geo.lat != null && geo.lng != null) {
            latitude = String(geo.lat);
            longitude = String(geo.lng);
          }
        } catch {
          /* optional geocode */
        }
      }

      const categoryMap: Record<string, string> = {
        "Full Service Gym": "gym",
        "CrossFit Box": "gym",
        "Yoga Studio": "studio",
        "Dance Studio": "studio",
        "Martial Arts Dojo": "gym",
        "Boxing Gym": "gym",
        "Rock Climbing Gym": "gym",
        "Swimming Pool": "pool",
        "Tennis Court": "court",
        "Basketball Court": "court",
        "Soccer Field": "field",
        "Multi-Sport Complex": "field",
      };

      const sports = [
        ...formData.cardioEquipment.slice(0, 2).map(() => "Fitness"),
        ...formData.strengthEquipment.slice(0, 1).map(() => "Strength"),
      ].filter(Boolean);
      if (sports.length === 0) sports.push("Fitness");

      const hours: Record<string, string> = {};
      for (const [day, h] of Object.entries(formData.operatingHours)) {
        if (h.closed) hours[day] = "Closed";
        else if (h.open && h.close) hours[day] = `${h.open} – ${h.close}`;
      }

      const description = [
        formData.uniqueSellingPoints,
        formData.policies,
        formData.specialOffers,
      ]
        .filter(Boolean)
        .join("\n\n");

      const res = await apiRequest("POST", "/api/places", {
        name: formData.facilityName.trim(),
        category: categoryMap[formData.facilityType] ?? "gym",
        sports,
        bio: formData.uniqueSellingPoints?.slice(0, 280) || `${formData.facilityType} on SURNA`,
        description: description || undefined,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: "USA",
        phone: formData.phone,
        email: formData.email,
        website: formData.website || undefined,
        amenities: formData.amenities,
        hours,
        latitude,
        longitude,
        bookingMode: "hourly_slots",
        slotPrice: formData.hourlyRate ? String(formData.hourlyRate) : undefined,
        profileImageUrl: profileMedia?.publicUrl ?? undefined,
        coverImageUrl: coverMedia?.publicUrl ?? undefined,
      });
      const place = (await res.json()) as { id: string };
      await Promise.all(
        galleryUrls.map((imageUrl, displayOrder) =>
          apiRequest("POST", `/api/places/${place.id}/photos`, { imageUrl, displayOrder }),
        ),
      );
      return place;
    },
    onSuccess: async (place) => {
      toast({
        title: "Facility listed",
        description: "Your gym is live — manage bookings from My Hub.",
      });
      await invalidateMyHubQueries(queryClient);
      setLocation(ROUTES.place(place.id));
    },
    onError: (err: Error) => {
      toast({
        title: "Could not list facility",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      publishMutation.mutate();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Basic Facility Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Facility Name *</label>
                <Input
                  required
                  value={formData.facilityName}
                  onChange={(e) => setFormData(prev => ({ ...prev, facilityName: e.target.value }))}
                  placeholder="e.g., Elite Fitness Center"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Business/Legal Name</label>
                <Input
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  placeholder="Legal business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Facility Type *</label>
                <select
                  required
                  value={formData.facilityType}
                  onChange={(e) => setFormData(prev => ({ ...prev, facilityType: e.target.value }))}
                  className="w-full px-3 py-2 bg-transparent border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select facility type...</option>
                  {facilityTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Street Address *</label>
                <Input
                  required
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <Input
                    required
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State *</label>
                  <Input
                    required
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ZIP *</label>
                  <Input
                    required
                    value={formData.zipCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                    placeholder="90210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number *</label>
                  <Input
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="gym@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Website</label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourgyμ.com"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Facility Specifications</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Square Footage</label>
                  <Input
                    type="number"
                    value={formData.totalSquareFootage}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalSquareFootage: e.target.value }))}
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Maximum Capacity *</label>
                  <Input
                    required
                    type="number"
                    value={formData.maxCapacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxCapacity: e.target.value }))}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Parking Spots</label>
                  <Input
                    type="number"
                    value={formData.parkingSpots}
                    onChange={(e) => setFormData(prev => ({ ...prev, parkingSpots: e.target.value }))}
                    placeholder="50"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="publicTransport"
                    checked={formData.publicTransport}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, publicTransport: !!checked }))}
                  />
                  <label htmlFor="publicTransport" className="text-sm">
                    Near public transportation
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cardio Equipment</label>
                <div className="grid grid-cols-2 gap-2">
                  {cardioOptions.map((equipment) => (
                    <div key={equipment} className="flex items-center space-x-2">
                      <Checkbox
                        id={equipment}
                        checked={formData.cardioEquipment.includes(equipment)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              cardioEquipment: [...prev.cardioEquipment, equipment] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              cardioEquipment: prev.cardioEquipment.filter(e => e !== equipment) 
                            }));
                          }
                        }}
                      />
                      <label htmlFor={equipment} className="text-xs">{equipment}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Strength Equipment</label>
                <div className="grid grid-cols-2 gap-2">
                  {strengthOptions.map((equipment) => (
                    <div key={equipment} className="flex items-center space-x-2">
                      <Checkbox
                        id={equipment}
                        checked={formData.strengthEquipment.includes(equipment)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              strengthEquipment: [...prev.strengthEquipment, equipment] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              strengthEquipment: prev.strengthEquipment.filter(e => e !== equipment) 
                            }));
                          }
                        }}
                      />
                      <label htmlFor={equipment} className="text-xs">{equipment}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Amenities</label>
                <div className="grid grid-cols-2 gap-2">
                  {amenitiesOptions.map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox
                        id={amenity}
                        checked={formData.amenities.includes(amenity)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({ 
                              ...prev, 
                              amenities: [...prev.amenities, amenity] 
                            }));
                          } else {
                            setFormData(prev => ({ 
                              ...prev, 
                              amenities: prev.amenities.filter(a => a !== amenity) 
                            }));
                          }
                        }}
                      />
                      <label htmlFor={amenity} className="text-xs">{amenity}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Pricing Structure</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Hourly Rate (USD) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-token-text" />
                    <Input
                      required
                      type="number"
                      value={formData.hourlyRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                      placeholder="50"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Daily Rate (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-token-text" />
                    <Input
                      type="number"
                      value={formData.dailyRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dailyRate: e.target.value }))}
                      placeholder="300"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Rate (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-token-text" />
                    <Input
                      type="number"
                      value={formData.monthlyRate}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthlyRate: e.target.value }))}
                      placeholder="5000"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Peak Hour Surcharge (%)</label>
                  <Input
                    type="number"
                    value={formData.peakHourSurcharge}
                    onChange={(e) => setFormData(prev => ({ ...prev, peakHourSurcharge: e.target.value }))}
                    placeholder="25"
                  />
                </div>
              </div>

              {formData.facilityType && earningPotentials[formData.facilityType as keyof typeof earningPotentials] && (
                <div className="bg-card border border-primary/20 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-foreground mb-2">💰 Typical Pricing for {formData.facilityType}</h4>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Hourly: {earningPotentials[formData.facilityType as keyof typeof earningPotentials].hourly}</div>
                    <div>Daily: {earningPotentials[formData.facilityType as keyof typeof earningPotentials].daily}</div>
                    <div>Monthly: {earningPotentials[formData.facilityType as keyof typeof earningPotentials].monthly}</div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Special Offers & Packages</label>
                <Textarea
                  value={formData.specialOffers}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialOffers: e.target.value }))}
                  placeholder="Student discounts, bulk booking deals, off-peak rates..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Operating Hours & Availability</h3>
            <div className="space-y-4">
              {Object.entries(formData.operatingHours).map(([day, hours]) => (
                <div key={day} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium capitalize">{day}</div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${day}-closed`}
                      checked={hours.closed}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        operatingHours: {
                          ...prev.operatingHours,
                          [day]: { ...hours, closed: !!checked }
                        }
                      }))}
                    />
                    <label htmlFor={`${day}-closed`} className="text-xs">Closed</label>
                  </div>
                  {!hours.closed && (
                    <>
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          operatingHours: {
                            ...prev.operatingHours,
                            [day]: { ...hours, open: e.target.value }
                          }
                        }))}
                        className="w-24 text-xs"
                      />
                      <span className="text-xs">to</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          operatingHours: {
                            ...prev.operatingHours,
                            [day]: { ...hours, close: e.target.value }
                          }
                        }))}
                        className="w-24 text-xs"
                      />
                    </>
                  )}
                </div>
              ))}
              
              <div className="bg-card border border-primary/20 rounded-lg p-3">
                <h4 className="text-sm font-medium text-foreground mb-2">📅 Booking Tips</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Extended hours increase booking potential</li>
                  <li>• Weekend availability is highly valued</li>
                  <li>• Early morning slots (6-9 AM) are popular</li>
                  <li>• Evening prime time (5-8 PM) commands higher rates</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Policies & Rules</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Minimum Age Requirement</label>
                <Input
                  type="number"
                  value={formData.minimumAge}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimumAge: e.target.value }))}
                  placeholder="16"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Dress Code Requirements</label>
                <Textarea
                  value={formData.dresscode}
                  onChange={(e) => setFormData(prev => ({ ...prev, dresscode: e.target.value }))}
                  placeholder="Athletic wear required, closed-toe shoes, no jeans or street clothes..."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Facility Rules & Policies</label>
                <Textarea
                  value={formData.policies}
                  onChange={(e) => setFormData(prev => ({ ...prev, policies: e.target.value }))}
                  placeholder="No food or drinks except water, clean equipment after use, respect other users..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cancellation Policy *</label>
                <select
                  required
                  value={formData.cancellationPolicy}
                  onChange={(e) => setFormData(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
                  className="w-full px-3 py-2 bg-transparent border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select policy...</option>
                  <option value="flexible">Flexible - 2 hour notice</option>
                  <option value="moderate">Moderate - 24 hour notice</option>
                  <option value="strict">Strict - 48 hour notice</option>
                  <option value="no-refund">No refunds once booked</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unique Selling Points</label>
                <Textarea
                  value={formData.uniqueSellingPoints}
                  onChange={(e) => setFormData(prev => ({ ...prev, uniqueSellingPoints: e.target.value }))}
                  placeholder="What makes your facility special? State-of-the-art equipment, expert staff, premium location..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Business Verification & Assets</h3>
            <div className="space-y-4">
              <CreateMediaSection
                cover={coverMedia}
                onCoverChange={setCoverMedia}
                logo={profileMedia}
                onLogoChange={setProfileMedia}
                gallery={galleryUrls}
                onGalleryChange={setGalleryUrls}
                maxGallery={8}
                coverLabel="Cover photo"
                coverHint="Wide shot of your facility — shows on map pins and listing cards."
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Business License #</label>
                  <Input
                    value={formData.businessLicense}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessLicense: e.target.value }))}
                    placeholder="License number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Years in Business</label>
                  <Input
                    type="number"
                    value={formData.yearsInBusiness}
                    onChange={(e) => setFormData(prev => ({ ...prev, yearsInBusiness: e.target.value }))}
                    placeholder="5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Owner/Manager Experience</label>
                <Textarea
                  value={formData.ownerExperience}
                  onChange={(e) => setFormData(prev => ({ ...prev, ownerExperience: e.target.value }))}
                  placeholder="Background in fitness industry, certifications, achievements..."
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, termsAccepted: !!checked }))}
                  />
                  <label htmlFor="terms" className="text-sm">
                    I agree to the <span className="text-primary underline">Facility Listing Terms</span> *
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="insurance"
                    checked={formData.liabilityInsurance}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, liabilityInsurance: !!checked }))}
                  />
                  <label htmlFor="insurance" className="text-sm">
                    I have current liability insurance coverage *
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="background"
                    checked={formData.backgroundCheck}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, backgroundCheck: !!checked }))}
                  />
                  <label htmlFor="background" className="text-sm">
                    I consent to business verification and background check *
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.facilityName && formData.facilityType && formData.address && 
               formData.city && formData.state && formData.zipCode && formData.phone && formData.email;
      case 2:
        return formData.maxCapacity;
      case 3:
        return formData.hourlyRate;
      case 4:
        return true; // Operating hours are optional
      case 5:
        return formData.cancellationPolicy;
      case 6:
        return (
          formData.termsAccepted &&
          formData.liabilityInsurance &&
          formData.backgroundCheck &&
          Boolean(coverMedia?.publicUrl || profileMedia?.publicUrl || galleryUrls.length > 0)
        );
      default:
        return false;
    }
  };

  if (previewMode) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-background border-b border-primary/20 sticky top-0 z-40">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setPreviewMode(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold text-foreground">Facility Preview</h1>
              <Badge variant="outline" className="bg-primary/10 text-primary">Live Preview</Badge>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6">
          {/* Facility Listing Preview */}
          <Card className="mb-6">
            <CardContent className="p-6">
              {coverMedia?.publicUrl ? (
                <img
                  src={coverMedia.publicUrl}
                  alt=""
                  className="w-full h-40 object-cover rounded-lg mb-4"
                />
              ) : null}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {profileMedia?.publicUrl ? (
                    <img src={profileMedia.publicUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-primary" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{formData.facilityName || "Your Facility Name"}</h2>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="outline">{formData.facilityType || "Facility Type"}</Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    <Star className="w-3 h-3 mr-1" />
                    4.8
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {formData.city && formData.state ? `${formData.city}, ${formData.state}` : "Location"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-card rounded-lg">
                  <Users className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <div className="text-lg font-bold">{formData.maxCapacity || 100}</div>
                  <div className="text-xs text-muted-foreground">Max Capacity</div>
                </div>
                <div className="text-center p-3 bg-card rounded-lg">
                  <DollarSign className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <div className="text-lg font-bold">€{formData.hourlyRate || 50}</div>
                  <div className="text-xs text-muted-foreground">per hour</div>
                </div>
              </div>

              {formData.amenities.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm mb-2">Amenities</h4>
                  <div className="flex flex-wrap gap-1">
                    {formData.amenities.slice(0, 6).map((amenity) => (
                      <Badge key={amenity} variant="outline" className="text-xs">{amenity}</Badge>
                    ))}
                    {formData.amenities.length > 6 && (
                      <Badge variant="outline" className="text-xs">+{formData.amenities.length - 6} more</Badge>
                    )}
                  </div>
                </div>
              )}

              <Button className="w-full bg-primary hover:bg-primary/90">
                Book This Facility
              </Button>
            </CardContent>
          </Card>

          <Button onClick={() => setPreviewMode(false)} variant="outline" className="w-full">
            Back to Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-primary/20 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/join-us">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">List Your Gym</h1>
              <p className="text-xs text-muted-foreground">Step {currentStep} of 6</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPreviewMode(true)}
              className="text-xs"
            >
              Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-card h-2">
        <div 
          className="bg-primary h-2 transition-all duration-300"
          style={{ width: `${(currentStep / 6) * 100}%` }}
        />
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Step Content */}
          <Card>
            <CardContent className="p-6">
              {renderStep()}
            </CardContent>
          </Card>

          {/* Earning Potential Preview */}
          {currentStep === 3 && formData.hourlyRate && formData.maxCapacity && (
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Your Earning Potential (85% after SURNA fee)
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">50% Booked</div>
                    <div className="text-muted-foreground">€{((parseInt(formData.hourlyRate) * 12 * 15 * 0.5) * 0.85).toLocaleString()}/month</div>
                  </div>
                  <div>
                    <div className="font-medium">80% Booked</div>
                    <div className="text-muted-foreground">€{((parseInt(formData.hourlyRate) * 12 * 15 * 0.8) * 0.85).toLocaleString()}/month</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                Previous
              </Button>
            )}
            <Button
              type="submit"
              disabled={!canProceed() || publishMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {currentStep === 6 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {publishMutation.isPending ? "Publishing…" : "List my facility"}
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-xs text-muted-foreground">
            Need help with facility listing? Contact facilities@surna.com
          </div>
        </form>
      </div>
    </div>
  );
}