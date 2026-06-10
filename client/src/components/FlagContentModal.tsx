// Flag Content Modal - Allow users to report inappropriate content
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const flagContentSchema = z.object({
  contentType: z.string().min(1, "Content type is required"),
  contentId: z.string().min(1, "Content ID is required"),
  reason: z.string().min(1, "Reason is required"),
  description: z.string().optional()
});

type FlagContentForm = z.infer<typeof flagContentSchema>;

interface FlagContentModalProps {
  contentType: string;
  contentId: string;
  reportedUserId?: string;
  trigger?: React.ReactNode;
}

export function FlagContentModal({ 
  contentType, 
  contentId, 
  reportedUserId,
  trigger 
}: FlagContentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<FlagContentForm>({
    resolver: zodResolver(flagContentSchema),
    defaultValues: {
      contentType,
      contentId,
      reason: "",
      description: ""
    }
  });

  const flagContentMutation = useMutation({
    mutationFn: async (data: FlagContentForm & { reportedUserId?: string }) => {
      return await apiRequest("POST", "/api/admin/flag-content", data);
    },
    onSuccess: () => {
      toast({
        title: "Content Flagged",
        description: "Thank you for reporting this content. Our moderators will review it shortly."
      });
      setOpen(false);
      form.reset();
      // Refresh any relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-content"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to flag content. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: FlagContentForm) => {
    flagContentMutation.mutate({
      ...data,
      reportedUserId
    });
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" data-testid="button-flag-content">
      <Flag className="h-4 w-4 mr-2" />
      Flag
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" data-testid="flag-content-modal">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Help us maintain a safe community by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for reporting</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-flag-reason">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="spam">Spam or unwanted content</SelectItem>
                      <SelectItem value="harassment">Harassment or bullying</SelectItem>
                      <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                      <SelectItem value="violence">Violence or threats</SelectItem>
                      <SelectItem value="hate_speech">Hate speech</SelectItem>
                      <SelectItem value="misinformation">False information</SelectItem>
                      <SelectItem value="copyright">Copyright violation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional details (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Provide additional context about why you're reporting this content..."
                      className="resize-none"
                      rows={3}
                      data-testid="textarea-flag-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-flag"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={flagContentMutation.isPending}
                data-testid="button-submit-flag"
              >
                {flagContentMutation.isPending ? "Reporting..." : "Report Content"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}