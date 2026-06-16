import { useState } from "react";
import { Camera } from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";

import { useTheme } from "@/contexts/ThemeContext";

import { useSurnaCamera } from "./SurnaCameraContext";

import { PostComposerSheet } from "@/components/feed/PostComposerSheet";

import { invalidateFeedQueries } from "@/lib/postActions";



type Props = {

  isDark?: boolean;

};



/** Feed composer — text post sheet + dedicated camera button. */

export default function FeedShareMoment({ isDark: isDarkProp }: Props) {

  const { user } = useAuth();

  const { isDark: resolvedDark } = useTheme();

  const isDark = isDarkProp ?? resolvedDark;

  const { openCamera } = useSurnaCamera();

  const queryClient = useQueryClient();

  const [composerOpen, setComposerOpen] = useState(false);



  const openCameraFlow = () => {

    openCamera({

      source: "feed",

      mode: "post",

      onFeedPosted: () => {

        invalidateFeedQueries(queryClient);

        queryClient.invalidateQueries({ queryKey: ["/api/stories"] });

      },

      onStoryPosted: () => {

        queryClient.invalidateQueries({ queryKey: ["/api/stories"] });

      },

    });

  };



  const pillBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  const pillBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  const placeholder = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.38)";



  const initials =

    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.trim() ||

    user?.email?.[0]?.toUpperCase() ||

    "Y";



  return (

    <>

      <div

        style={{
          padding: "10px 16px 12px",
        }}

        data-testid="feed-share-moment"

      >

        <div

          style={{

            display: "flex",

            alignItems: "center",

            gap: 12,

          }}

        >

          <div

            style={{

              width: 36,

              height: 36,

              borderRadius: "50%",

              overflow: "hidden",

              flexShrink: 0,

              background: isDark ? "#1a1a1a" : "#ebebeb",

              border: `1px solid ${pillBorder}`,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              fontSize: 12,

              fontWeight: 700,

              color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)",

            }}

          >

            {user?.profileImageUrl ? (

              <img

                src={user.profileImageUrl}

                alt=""

                style={{ width: "100%", height: "100%", objectFit: "cover" }}

              />

            ) : (

              initials

            )}

          </div>



          <button

            type="button"

            onClick={() => setComposerOpen(true)}

            className="flex-1 min-w-0 text-left active:opacity-90 transition-opacity"

            style={{

              height: 40,

              borderRadius: 999,

              background: pillBg,

              border: `1px solid ${pillBorder}`,

              display: "flex",

              alignItems: "center",

              paddingLeft: 16,

              paddingRight: 12,

              cursor: "pointer",

            }}

            aria-label="Write a post"

          >

            <span style={{ fontSize: 14, fontWeight: 400, color: placeholder, letterSpacing: "-0.01em" }}>

              Share a moment…

            </span>

          </button>



          <button

            type="button"

            onClick={openCameraFlow}

            aria-label="Open camera"

            style={{

              width: 40,

              height: 40,

              borderRadius: "50%",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              flexShrink: 0,

              background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",

              border: `1px solid ${pillBorder}`,

              cursor: "pointer",

            }}

          >

            <Camera size={20} strokeWidth={1.75} color={isDark ? "#fff" : "#111"} />

          </button>

        </div>

      </div>



      <PostComposerSheet open={composerOpen} onOpenChange={setComposerOpen} />

    </>

  );

}

