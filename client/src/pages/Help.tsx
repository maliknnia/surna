import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Search, ChevronDown, HelpCircle, MessageCircle, Video, Book } from "lucide-react";

export default function Help() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [openSection, setOpenSection] = useState<string | null>("getting-started");

  const faqSections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: "🚀",
      questions: [
        {
          question: "How do I create my SURNA profile?",
          answer: "Simply sign up with your email or social media account. Complete your profile by adding your sports interests, skill level, and location to get personalized game recommendations."
        },
        {
          question: "How do I find games near me?",
          answer: "Use the 'Find Games' tab to discover pickup games in your area. You can filter by sport, skill level, distance, and time. Make sure location services are enabled for the best results."
        },
        {
          question: "What sports are available on SURNA?",
          answer: "We support all major sports including basketball, soccer, tennis, volleyball, baseball, and many more. New sports are added regularly based on community demand."
        }
      ]
    },
    {
      id: "games-teams",
      title: "Games & Teams",
      icon: "🏆",
      questions: [
        {
          question: "How do I join a game?",
          answer: "Browse available games and click 'Join Game' on any that interest you. Some games require approval from the organizer, while others allow instant joining. You'll receive confirmation once accepted."
        },
        {
          question: "Can I create my own game?",
          answer: "Yes! Click the '+' button and select 'Create Game'. Fill in the details like sport, location, time, and skill level. Other players can then discover and join your game."
        },
        {
          question: "How do teams work?",
          answer: "Teams are groups of players who regularly play together. You can create or join teams, schedule practices, track stats, and communicate with teammates through our team management tools."
        },
        {
          question: "What happens if a game gets cancelled?",
          answer: "Game organizers can cancel games with at least 2 hours notice. All participants will receive notifications via push and email. You can also set backup games in case of cancellations."
        }
      ]
    },
    {
      id: "coaching",
      title: "Coaching Services",
      icon: "🎯",
      questions: [
        {
          question: "How do I find a coach?",
          answer: "Visit the 'Coaches' section to browse verified professional coaches. Filter by sport, location, price range, and specialty. Each coach has ratings, reviews, and detailed profiles."
        },
        {
          question: "Are all coaches verified?",
          answer: "Yes! All coaches go through our rigorous verification process including background checks, certification validation, and skill assessments. Look for the verified badge on their profiles."
        },
        {
          question: "How does payment work for coaching?",
          answer: "Payments are processed securely through the app. You can book and pay for sessions in advance. Coaches are paid after successful completion of sessions, minus our small platform fee."
        },
        {
          question: "Can I get a refund if I'm not satisfied?",
          answer: "We offer a satisfaction guarantee. If you're not happy with a coaching session within the first 15 minutes, you can request a full refund or switch to a different coach."
        }
      ]
    },
    {
      id: "account-billing",
      title: "Account & Billing",
      icon: "💳",
      questions: [
        {
          question: "Is SURNA free to use?",
          answer: "Basic features like finding and joining games are free. SURNA Pro offers premium features like advanced stats, priority booking, and exclusive coach access for €9.99/month."
        },
        {
          question: "How do I update my payment information?",
          answer: "Go to Settings > Billing & Subscriptions to update your payment methods, view billing history, and manage your subscription. All payments are processed securely."
        },
        {
          question: "How do I cancel my subscription?",
          answer: "You can cancel anytime in Settings > Billing. Your premium features will remain active until the end of your current billing period. No cancellation fees or penalties."
        },
        {
          question: "What if I forgot my password?",
          answer: "Use the 'Forgot Password' link on the login page. We'll send a reset link to your registered email address. For additional help, contact our support team."
        }
      ]
    },
    {
      id: "safety-community",
      title: "Safety & Community",
      icon: "🛡️",
      questions: [
        {
          question: "How do you ensure player safety?",
          answer: "All users verify their identities during registration. We have community guidelines, reporting systems, and 24/7 moderation. Players can rate and review each other to maintain quality standards."
        },
        {
          question: "What should I do if I encounter inappropriate behavior?",
          answer: "Report any issues immediately through the app or contact support. We take all reports seriously and have zero tolerance for harassment, discrimination, or unsafe behavior."
        },
        {
          question: "How does the rating system work?",
          answer: "After each game or interaction, you can rate other players on sportsmanship, skill level, and reliability. These ratings help maintain a positive community and help others find compatible players."
        },
        {
          question: "What are the community guidelines?",
          answer: "Be respectful, honest about your skill level, show up on time for games, and maintain good sportsmanship. Full guidelines are available in Settings > Community Guidelines."
        }
      ]
    }
  ];

  const quickActions = [
    {
      title: "Video Tutorials",
      description: "Watch step-by-step guides",
      icon: Video,
      color: "bg-transparent border border-border text-token-text",
      action: () => setLocation("/events"),
    },
    {
      title: "Live Chat Support",
      description: "Get instant help",
      icon: MessageCircle,
      color: "bg-transparent border border-border text-token-text",
      action: () => setLocation("/messages"),
    },
    {
      title: "User Manual",
      description: "Complete documentation",
      icon: Book,
      color: "bg-transparent border border-border text-token-text",
      action: () => setLocation("/settings"),
    },
  ];

  const filteredSections = faqSections.map(section => ({
    ...section,
    questions: section.questions.filter(
      q => q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.questions.length > 0 || searchQuery === "");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background  sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-token-text">Help Center</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-transparent border border-border rounded-full flex items-center justify-center mx-auto">
            <HelpCircle className="h-8 w-8 text-token-text" />
          </div>
          <h2 className="text-2xl font-bold text-token-text">How can we help?</h2>
          <p className="text-token-text text-sm">
            Find answers to common questions or get in touch with our support team.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search for help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3  rounded-xl focus:outline-none focus:ring-2 focus:ring-token-accent"
          />
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-token-text" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                className="h-auto p-4 justify-start"
                onClick={action.action}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${action.color} mr-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-xs text-token-text">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>

        {/* FAQ Sections */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Frequently Asked Questions</h3>
          
          {filteredSections.map((section) => (
            <div key={section.id} className="bg-background rounded-lg  overflow-hidden">
              <Collapsible
                open={openSection === section.id}
                onOpenChange={(open) => setOpenSection(open ? section.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto font-medium"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{section.icon}</span>
                      <span>{section.title}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${
                      openSection === section.id ? "rotate-180" : ""
                    }`} />
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="">
                  <div className="p-4 space-y-4">
                    {section.questions.map((qa, index) => (
                      <div key={index} className="space-y-2">
                        <h4 className="font-medium text-sm text-token-text">
                          {qa.question}
                        </h4>
                        <p className="text-sm text-token-text leading-relaxed">
                          {qa.answer}
                        </p>
                        {index < section.questions.length - 1 && (
                          <hr className=" my-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </div>

        {/* Still Need Help */}
        <div className="bg-gradient-to-r from-background to-background text-token-text rounded-xl p-6 text-center">
          <h3 className="font-bold text-lg mb-2">Still need help?</h3>
          <p className="text-sm text-token-text mb-4">
            Our support team is here to help you get the most out of SURNA.
          </p>
          <div className="space-y-2">
            <Link href="/contact">
              <Button className="w-full bg-transparent border border-border text-token-text hover:bg-background">
                Contact Support
              </Button>
            </Link>
            <Button
              variant="ghost"
              className="w-full text-token-text hover:bg-transparent border border-border"
              onClick={() => setLocation("/discover")}
            >
              Explore community
            </Button>
          </div>
        </div>

        {/* Popular Articles */}
        <div className="space-y-3">
          <h3 className="font-bold text-lg">Popular Articles</h3>
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-left" onClick={() => setLocation("/teams")}>
              <span className="text-sm">🏀 Basketball Game Rules and Etiquette</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-left" onClick={() => setLocation("/teams")}>
              <span className="text-sm">⚽ How to Start a Soccer Team</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-left" onClick={() => setLocation("/places")}>
              <span className="text-sm">🎾 Tennis Court Booking Guide</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-left" onClick={() => setLocation("/events/create")}>
              <span className="text-sm">🏐 Volleyball Tournament Organization</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}