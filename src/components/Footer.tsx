import { Cherry, MapPin, Phone, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-display text-xl font-bold">
              <Cherry className="h-6 w-6 text-primary" />
              <span>Cherry's Store</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your one-stop shop for quality products at unbeatable prices. 
              Serving customers across Pakistan with Cash on Delivery.
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold">Contact Us</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>0300-1234567</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>support@cherrysstore.pk</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Lahore, Pakistan</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold">Payment Method</h3>
            <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              💵 Cash on Delivery Only
            </div>
            <p className="text-sm text-muted-foreground">
              Pay when you receive your order. No online payment required!
            </p>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Cherry's Store. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
