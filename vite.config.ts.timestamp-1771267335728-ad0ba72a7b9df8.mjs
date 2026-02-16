// vite.config.ts
import { defineConfig } from "file:///F:/vibe_coding/GT-ASSIST-V2/node_modules/vite/dist/node/index.js";
import react from "file:///F:/vibe_coding/GT-ASSIST-V2/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/react-dom/") || id.includes("/react/")) return "react";
          if (id.includes("/@clerk/")) return "clerk";
          if (id.includes("/@supabase/")) return "supabase";
          if (id.includes("/react-markdown/") || id.includes("/remark-gfm/") || id.includes("/micromark") || id.includes("/mdast") || id.includes("/unist")) return "markdown";
          if (id.includes("/@radix-ui/")) return "radix";
          if (id.includes("/lucide-react/")) return "icons";
          if (id.includes("/react-joyride/") || id.includes("/react-paystack/")) return "integrations";
          return "vendor";
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJGOlxcXFx2aWJlX2NvZGluZ1xcXFxHVC1BU1NJU1QtVjJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkY6XFxcXHZpYmVfY29kaW5nXFxcXEdULUFTU0lTVC1WMlxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRjovdmliZV9jb2RpbmcvR1QtQVNTSVNULVYyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIGJ1aWxkOiB7XG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rcyhpZCkge1xuICAgICAgICAgIGlmICghaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSByZXR1cm47XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvcmVhY3QtZG9tLycpIHx8IGlkLmluY2x1ZGVzKCcvcmVhY3QvJykpIHJldHVybiAncmVhY3QnO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL0BjbGVyay8nKSkgcmV0dXJuICdjbGVyayc7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvQHN1cGFiYXNlLycpKSByZXR1cm4gJ3N1cGFiYXNlJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9yZWFjdC1tYXJrZG93bi8nKSB8fCBpZC5pbmNsdWRlcygnL3JlbWFyay1nZm0vJykgfHwgaWQuaW5jbHVkZXMoJy9taWNyb21hcmsnKSB8fCBpZC5pbmNsdWRlcygnL21kYXN0JykgfHwgaWQuaW5jbHVkZXMoJy91bmlzdCcpKSByZXR1cm4gJ21hcmtkb3duJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9AcmFkaXgtdWkvJykpIHJldHVybiAncmFkaXgnO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL2x1Y2lkZS1yZWFjdC8nKSkgcmV0dXJuICdpY29ucyc7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvcmVhY3Qtam95cmlkZS8nKSB8fCBpZC5pbmNsdWRlcygnL3JlYWN0LXBheXN0YWNrLycpKSByZXR1cm4gJ2ludGVncmF0aW9ucyc7XG4gICAgICAgICAgcmV0dXJuICd2ZW5kb3InO1xuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlRLFNBQVMsb0JBQW9CO0FBQ3RTLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sYUFBYSxJQUFJO0FBQ2YsY0FBSSxDQUFDLEdBQUcsU0FBUyxjQUFjLEVBQUc7QUFDbEMsY0FBSSxHQUFHLFNBQVMsYUFBYSxLQUFLLEdBQUcsU0FBUyxTQUFTLEVBQUcsUUFBTztBQUNqRSxjQUFJLEdBQUcsU0FBUyxVQUFVLEVBQUcsUUFBTztBQUNwQyxjQUFJLEdBQUcsU0FBUyxhQUFhLEVBQUcsUUFBTztBQUN2QyxjQUFJLEdBQUcsU0FBUyxrQkFBa0IsS0FBSyxHQUFHLFNBQVMsY0FBYyxLQUFLLEdBQUcsU0FBUyxZQUFZLEtBQUssR0FBRyxTQUFTLFFBQVEsS0FBSyxHQUFHLFNBQVMsUUFBUSxFQUFHLFFBQU87QUFDMUosY0FBSSxHQUFHLFNBQVMsYUFBYSxFQUFHLFFBQU87QUFDdkMsY0FBSSxHQUFHLFNBQVMsZ0JBQWdCLEVBQUcsUUFBTztBQUMxQyxjQUFJLEdBQUcsU0FBUyxpQkFBaUIsS0FBSyxHQUFHLFNBQVMsa0JBQWtCLEVBQUcsUUFBTztBQUM5RSxpQkFBTztBQUFBLFFBQ1Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
