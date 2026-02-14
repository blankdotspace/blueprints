import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-4xl font-black mb-4">404 - Blueprint Not Found</h1>
            <p className="text-muted-foreground mb-8">The coordinate you're looking for does not exist in this cluster.</p>
            <Link
                href="/"
                className="px-6 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all"
            >
                Return to Base
            </Link>
        </div>
    );
}
